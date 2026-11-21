// Nagarika's MCP tools: read-only questions over the open data API (_site/api/v1/ and
// _site/data/ on the site, built by collector/api.py and collector/build.py).
// Every answer keeps the official source link and the date the record was last checked.

export const SITE = "https://is-this-itt.github.io/nagarika/";

const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const enc = encodeURIComponent;
const rows = t => (t?.rows || []).map(r => Object.fromEntries(t.fields.map((f, i) => [f, r[i]])));
const clampLimit = (n, d = 20) => Math.max(1, Math.min(100, Number.isFinite(+n) && +n > 0 ? Math.floor(+n) : d));

// Find one entry by id or name: exact first, then a name that starts with or contains it.
function pick(list, want, keys) {
  const w = slug(want);
  if (!w) return null;
  const vals = e => keys.map(k => slug(e[k]));
  return list.find(e => vals(e).includes(w))
    || list.find(e => vals(e).some(v => v.startsWith(w)))
    || list.find(e => vals(e).some(v => v.includes(w)))
    || null;
}

const hint = (what, options) => ({ error: `${what} not found.`, options: options.slice(0, 60) });

function filterWorks(items, { query, status, flagged_only }, text) {
  const q = slug(query);
  const st = String(status || "").toLowerCase();
  return items.filter(w => (!q || slug(text(w)).includes(q))
    && (!st || String(w.status || w.stage || "").toLowerCase().includes(st))
    && (!flagged_only || w.flag));
}

const READING = "Amounts are in rupees. An empty field means the source does not publish it: say \"not published\", never guess. "
  + "Cite source_url (or link) and last_checked when you use a record.";

// ---------- tools ----------

export const TOOLS = [
  {
    name: "search_places",
    title: "Find a place",
    description: "Find a city, ward, town, district, PIN code, state, Lok Sabha constituency or assembly constituency in Nagarika's data. "
      + "Each match says which tool answers questions about it and the exact arguments to pass. Start here when the user names a place.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the user typed, e.g. \"Koramangala\", \"560034\", \"Varanasi\", \"Anandapur\"" },
        kind: { type: "string", description: "Optional: only this kind, e.g. \"Ward\", \"Lok Sabha constituency\", \"Assembly constituency\", \"PIN code\"" },
        limit: { type: "integer", description: "Most matches to return (default 10)" },
      },
      required: ["query"],
    },
    async run(a, get) {
      const all = rows(await get("api/v1/places.json"));
      const q = slug(a.query);
      if (!q) return { error: "Give a place name, PIN code or constituency." };
      const words = q.split("-");
      const score = p => {
        const l = slug(p.label), d = slug(p.detail);
        if (l === q) return 100;
        if (l.startsWith(q)) return 80;
        if (l.split("-").some(x => x.startsWith(q))) return 60;
        if (l.includes(q)) return 40;
        if (words.every(x => (l + "-" + d).includes(x))) return 20;
        return 0;
      };
      const kind = slug(a.kind);
      const hits = all.filter(p => !kind || slug(p.kind) === kind)
        .map(p => [score(p), p]).filter(([s]) => s).sort((x, y) => y[0] - x[0]).slice(0, clampLimit(a.limit, 10))
        .map(([, p]) => p);
      return { query: a.query, matches: hits, note: hits.length ? "Call the tool named in each match with its args." :
        "No match. Try another spelling, a nearby bigger place, or list_datasets to see what is covered." };
    },
  },
  {
    name: "list_datasets",
    title: "What data Nagarika has",
    description: "List Nagarika's datasets: what each covers, its official sources, when it was last checked, known gaps, the tool to use and the raw file URLs. "
      + "Use it to tell the user what can and cannot be answered.",
    inputSchema: { type: "object", properties: {} },
    async run(_a, get) {
      return get("api/v1/datasets.json");
    },
  },
  {
    name: "get_road_works",
    title: "Road works in a place",
    description: "Road, footpath and drain works (tenders, work orders, payments) from official e-procurement portals: who is doing the work, cost, dates, status. "
      + "Give a state (and optionally a town or district as place), a city (bengaluru, chennai, mumbai) and optionally a ward, or a PIN code. "
      + "With only a state or city you get totals, the list of places or wards, and the newest works.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", description: "State name or slug, e.g. \"Karnataka\", \"tamil-nadu\"" },
        place: { type: "string", description: "Town or district within the state, as search_places returns it" },
        city: { type: "string", description: "City with ward-level data: bengaluru, chennai or mumbai" },
        ward: { type: "string", description: "Ward key, number or name within the city" },
        pincode: { type: "string", description: "Six-digit PIN code" },
        query: { type: "string", description: "Only works whose title, agency, place or PIN contains this" },
        status: { type: "string", description: "Only works whose status contains this, e.g. \"awarded\", \"published\"" },
        flagged_only: { type: "boolean", description: "Only works past their official deadline or estimated finish" },
        limit: { type: "integer", description: "Most works to return (default 20, max 100)" },
      },
    },
    async run(a, get) {
      const idx = await get("api/v1/roads/index.json");
      const text = w => [w.title, w.agency, w.office, w.place, w.pincode, w.contractor].join(" ");
      const out = (head, file, list, link) => {
        const items = filterWorks(rows(list), a, text);
        const limit = clampLimit(a.limit);
        return { ...head, site_link: link, total_in_file: file.shown ?? file.works,
          matching: items.length, shown: Math.min(items.length, limit),
          works: items.slice(0, limit).map(w => ({ ...w, link: `${SITE}#/work/${enc(w.id)}` })),
          note: (file.shown && file.shown < file.works
            ? `Only the newest ${file.shown} of ${file.works} works are searchable here; the full list is in the CSV download (list_datasets). ` : "")
            + READING };
      };
      if (a.pincode) {
        const pin = String(a.pincode).replace(/\D/g, "");
        let pf;
        try {
          pf = await get(`api/v1/roads/pin/${pin}.json`);
        } catch {
          return { error: `No road works with PIN code ${pin} in our data. Many sources do not give a PIN; try search_places with the area or town name.` };
        }
        const { items, ...head } = pf;
        return out(head, pf, items, `${SITE}#/search?q=${pin}`);
      }
      if (a.city) {
        const c = pick(idx.cities, a.city, ["slug", "name"]);
        if (!c) return hint("City", idx.cities.map(c => c.slug));
        const cf = await get(`api/v1/roads/city/${c.slug}.json`);
        if (a.ward) {
          const w = pick(cf.wards, a.ward, ["key", "no", "name"]);
          if (!w) return hint(`Ward in ${c.name}`, cf.wards.map(w => `${w.key} (${w.no} ${w.name})`));
          const wf = await get(`api/v1/roads/city/${c.slug}/${w.key}.json`);
          const { items, ...head } = wf;
          return out(head, wf, items, `${SITE}#/city/${c.slug}/ward/${w.key}`);
        }
        const { newest, wards, ...head } = cf;
        if (a.query || a.status || a.flagged_only) {
          return { ...head, error: "To filter works in a city, also give a ward (see wards), or use state + place.",
            wards: wards.filter(w => w.works).sort((x, y) => y.works - x.works).slice(0, 40) };
        }
        return { ...out(head, { works: newest.rows.length }, newest, `${SITE}#/city/${c.slug}`),
          busiest_wards: wards.filter(w => w.works).sort((x, y) => y.works - x.works).slice(0, 20) };
      }
      if (!a.state) return { error: "Give a state (with an optional place), or a city.", states: idx.states, cities: idx.cities };
      const s = pick(idx.states, a.state, ["slug", "state"]);
      if (!s) return hint("State", idx.states.map(s => s.slug));
      const sf = await get(`api/v1/roads/${s.slug}.json`);
      if (a.place) {
        const p = pick(sf.places, a.place, ["slug", "name"]);
        if (!p) return hint(`Place in ${s.state}`, sf.places.map(p => p.slug));
        const pf = await get(`api/v1/roads/${s.slug}/${p.slug}.json`);
        const { items, ...head } = pf;
        return out(head, pf, items, `${SITE}#/state/${enc(s.state)}?q=${enc(p.name)}`);
      }
      const { newest, places, ...head } = sf;
      const r = out(head, { works: newest.rows.length }, newest, `${SITE}#/state/${enc(s.state)}`);
      r.places = places.slice(0, 60);
      r.note = "Works shown are the newest in the state; filters apply to these only. Give a place for a full list there. " + READING;
      return r;
    },
  },
  {
    name: "get_mp_funds",
    title: "MP local area fund (MPLADS) works",
    description: "Works Lok Sabha MPs recommended from their MPLADS fund (₹5 crore a year), from the official eSAKSHI portal: amounts recommended, sanctioned and spent, stage, agency. "
      + "No arguments: totals by state. State only: every constituency with its MP and totals. Constituency (name or id, state optional): its works.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", description: "State name or slug" },
        constituency: { type: "string", description: "Lok Sabha constituency name or id, e.g. \"Varanasi\"" },
        query: { type: "string", description: "Only works whose description, activity or agency contains this" },
        stage: { type: "string", description: "Only works whose stage contains this, e.g. \"completed\", \"pending\"" },
        limit: { type: "integer", description: "Most works to return (default 20, max 100)" },
      },
    },
    async run(a, get) {
      const idx = await get("data/mplads_index.json");
      const strip = ({ constituencies, ...s }) => s;
      const src = "eSAKSHI MPLADS portal, Ministry of Statistics and Programme Implementation: https://mplads.mospi.gov.in/";
      let s = a.state ? pick(idx, a.state, ["slug", "state"]) : null;
      if (a.state && !s) return hint("State", idx.map(s => s.slug));
      if (!a.constituency) {
        if (!s) return { source: src, states: idx.map(strip), note: READING };
        return { source: src, ...strip(s), site_link: `${SITE}#/mp/${s.slug}`, constituencies: s.constituencies, note: READING };
      }
      let c = null;
      for (const st of s ? [s] : idx) {
        c = pick(st.constituencies, a.constituency, ["id", "name"]);
        if (c) { s = st; break; }
      }
      if (!c) return hint("Lok Sabha constituency", (s ? s.constituencies : idx.flatMap(x => x.constituencies)).map(c => c.name));
      const f = await get(`api/v1/mp/${s.slug}/${c.id}.json`);
      const items = filterWorks(rows(f.items), { query: a.query, status: a.stage }, w => [w.description, w.activity, w.category, w.implementing_agency].join(" "));
      const limit = clampLimit(a.limit);
      return { source: src, state: s.state, constituency: c.name, constituency_id: c.id, mp: c.mp, tenure: f.tenure,
        totals: { works: c.works, recommended: c.recommended, sanctioned: c.sanctioned, spent: c.spent, completed: c.completed },
        site_link: `${SITE}#/mp/${s.slug}/${c.id}`, matching: items.length, shown: Math.min(items.length, limit),
        works: items.slice(0, limit).map(w => ({ ...w, link: `${SITE}#/mpwork/${s.slug}/${enc(w.id)}` })), note: READING };
    },
  },
  {
    name: "get_mla_funds",
    title: "MLA local area fund works",
    description: "Works MLAs chose from their state's local area development fund, from official state portals (Odisha and Uttar Pradesh so far). "
      + "No arguments: states covered. State only: constituencies with MLA and totals. Constituency (state optional): its works.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", description: "State name or slug, e.g. \"Odisha\"" },
        constituency: { type: "string", description: "Assembly constituency name, e.g. \"Anandapur\"" },
        query: { type: "string", description: "Only works whose name, category or village contains this" },
        status: { type: "string", description: "Only works whose status contains this, e.g. \"completed\", \"not started\"" },
        financial_year: { type: "string", description: "Only this year, e.g. \"2025-26\"" },
        limit: { type: "integer", description: "Most works to return (default 20, max 100)" },
      },
    },
    async run(a, get) {
      const idx = await get("data/mlalads_index.json");
      const strip = ({ constituencies, ...s }) => s;
      const gaps = "Collected so far: " + idx.map(s => s.state).join(", ") + ". Delhi publishes only PDF sanction orders; Madhya Pradesh's portal needs a login; other states are not collected yet.";
      let s = a.state ? pick(idx, a.state, ["slug", "state"]) : null;
      if (a.state && !s) return { ...hint("State", idx.map(s => s.slug)), coverage: gaps };
      if (!a.constituency) {
        if (!s) return { coverage: gaps, states: idx.map(strip), note: READING };
        return { ...strip(s), coverage: gaps, site_link: `${SITE}#/mla/${s.slug}`, constituencies: s.constituencies, note: READING };
      }
      let c = null;
      for (const st of s ? [s] : idx) {
        c = pick(st.constituencies, a.constituency, ["id", "name"]);
        if (c) { s = st; break; }
      }
      if (!c) return { ...hint("Assembly constituency", (s ? s.constituencies : idx.flatMap(x => x.constituencies)).map(c => c.name)), coverage: gaps };
      const f = await get(`data/mlalads/${s.slug}/${c.id}.json`);
      let items = filterWorks(rows(f), a, w => [w.name, w.category, w.department, w.village, w.block, w.agency].join(" "));
      if (a.financial_year) items = items.filter(w => w.financial_year === a.financial_year);
      const limit = clampLimit(a.limit);
      return { state: s.state, constituency: c.name, district: c.district, mla: c.mla || "",
        totals: strip(c), site_link: `${SITE}#/mla/${s.slug}/${c.id}`, matching: items.length, shown: Math.min(items.length, limit),
        works: items.slice(0, limit).map(w => ({ ...w, link: `${SITE}#/mlawork/${s.slug}/${c.id}/${enc(w.id)}` })),
        note: (s.slug === "uttar-pradesh" ? "Uttar Pradesh's portal gives estimated cost and physical progress, not sanctioned or spent amounts; work details are in Hindi. " : "") + READING };
    },
  },
  {
    name: "get_education_help",
    title: "Education help by state",
    description: "Free school seats under RTE (25% in private schools) and scholarship portals for a state, plus the National Scholarship Portal: "
      + "official links, whether the portal opened when last checked, helplines, notices and last dates to apply.",
    inputSchema: {
      type: "object",
      properties: { state: { type: "string", description: "State name or slug, e.g. \"Karnataka\". Leave out for the national portals and the list of states." } },
    },
    async run(a, get) {
      const d = await get("data/education.json");
      const slim = p => ({ ...p, notices: (p.notices || []).slice(0, 12) });
      const national = d.portals.filter(p => p.state === "National").map(slim);
      const states = [...new Set(d.portals.map(p => p.state))].filter(s => s !== "National").sort();
      const guide = `${SITE}#/guides/education`;
      if (!a.state) return { checked: d.checked, guide, national, states_covered: states };
      const st = pick(states.map(s => ({ s })), a.state, ["s"]);
      if (!st) return { ...hint("State", states), national, guide };
      return { state: st.s, checked: d.checked, guide: `${guide}/${slug(st.s)}`,
        portals: d.portals.filter(p => p.state === st.s).map(slim), national,
        note: "\"loads: false\" means the portal did not open when we last checked; last_loaded is when it last did. Dates are as the portal showed them." };
    },
  },
  {
    name: "where_to_complain",
    title: "Where to complain",
    description: "Official complaint channels (helplines, apps, offices, emails) for a city or topic, each with where it was confirmed and when. "
      + "Always includes national channels (CPGRAMS, RTI).",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "bengaluru, chennai or mumbai" },
        topic: { type: "string", enum: ["roads", "mp_funds", "mla_funds"], description: "What the complaint is about" },
        state: { type: "string", description: "State, for MLA fund complaints, e.g. \"odisha\"" },
      },
    },
    async run(a, get) {
      const ch = await get("data/complaints.json");
      const keys = [slug(a.city), a.topic === "roads" ? "roads" : "", a.topic === "mp_funds" ? "mp" : "",
        a.topic === "mla_funds" && a.state ? "mla_" + slug(a.state).replace(/-/g, "_") : "", "national"].filter(Boolean);
      const abs = l => (l && l.startsWith("#") ? SITE + l : l);
      const channels = keys.flatMap(k => (ch[k] || []).map(c => ({ for: k, ...c, link: abs(c.link) })));
      const missing = keys.filter(k => !ch[k]);
      return { channels, not_covered_yet: missing,
        note: "Ask for a complaint number. If nothing happens, an RTI asks the office for the action taken: " + SITE + "#/guides/rti" };
    },
  },
];

export async function callTool(name, args, get) {
  const t = TOOLS.find(t => t.name === name);
  if (!t) throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
  return t.run(args || {}, get);
}
