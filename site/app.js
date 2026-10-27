// Nagarika: a small hash-routed single page app over static JSON.
// Structure: Home (search + topics) > Topic (road works, MP funds, ...) > Place (state > city/constituency > ward).
"use strict";

const app = document.getElementById("app");
const cache = {};
const REPO = "https://github.com/is-this-itt/nagarika";
const PAGE_SIZE = 25;

// Top-level topics. Only "live" ones have data today.
const TOPICS = [
  { key: "roads", name: "Road works", href: "#/roads", live: true,
    blurb: "Roads, footpaths and drains: who is doing the work, what it costs, when it should finish." },
  { key: "mp", name: "MP funds (MPLADS)", href: "#/mp", live: true,
    blurb: "Works your Member of Parliament recommended from their ₹5 crore a year local area fund." },
  { key: "mla", name: "MLA funds", href: "#/mla", live: true,
    blurb: "Works your MLA chose from their local area fund: temples, community halls, lights, roads. Odisha first." },
  { key: "help", name: "Help for children's education", href: "#/guides/education", live: true,
    blurb: "Free schooling, scholarships, meals and NGOs: what children and families can claim, and how." },
  { key: "water", name: "Water supply & sewerage" },
  { key: "lights", name: "Streetlights" },
  { key: "buildings", name: "Schools, hospitals & offices" },
  { key: "parks", name: "Parks & lakes" },
  { key: "waste", name: "Garbage & sanitation" },
];

// States whose MLA fund portals we collect from (from India; see docs/india-runner.md).
// Other states' portals are blocked, missing or need a login so far.
const MLA_STATES_NOTE = "Odisha only, for now. Madhya Pradesh, Delhi, Karnataka and Uttar Pradesh portals are next; their sites have not answered reliably yet.";

// ---------- data ----------
async function load(name) {
  if (!cache[name]) cache[name] = fetch("data/" + name).then(r => {
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return r.json();
  });
  return cache[name];
}

function table2objects(d) {
  return d.rows.map(row => {
    const o = {};
    d.fields.forEach((f, i) => { o[f] = row[i]; });
    return o;
  });
}

async function works() {
  if (!cache._works) {
    cache._works = load("works.json").then(d => table2objects(d).map(o => {
      o.wards = o.ward_ids ? o.ward_ids.split(";") : [];
      o.cost = Number(o.sanctioned_cost) || 0;
      o.paid = Number(o.amount_paid) || 0;
      return o;
    }));
  }
  return cache._works;
}

async function mpWorks(stateSlug) {
  const key = "_mp_" + stateSlug;
  if (!cache[key]) {
    cache[key] = load(`mplads/${stateSlug}.json`).then(d => table2objects(d).map(o => {
      o.amount = Number(o.sanction_amount) || Number(o.recommended_amount) || 0;
      o.spent = Number(o.actual_amount) || 0;
      return o;
    }));
  }
  return cache[key];
}

async function mlaWorks(stateSlug) {
  const key = "_mla_" + stateSlug;
  if (!cache[key]) {
    cache[key] = load(`mlalads/${stateSlug}.json`).then(d => table2objects(d).map(o => {
      o.amount = Number(o.sanction_amount) || Number(o.recommended_amount) || 0;
      o.spent = Number(o.spent_amount) || 0;
      o.cons = slugify(o.constituency);
      return o;
    }));
  }
  return cache[key];
}
const slugify = t => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function wardLookup() {
  if (!cache._wards) {
    cache._wards = load("wards.json").then(idx => {
      const m = {};
      for (const [city, list] of Object.entries(idx)) {
        m[city] = {};
        for (const [key, no, name, zone, assembly, pc] of list) m[city][key] = { key, no, name, zone, assembly, pc };
      }
      return m;
    });
  }
  return cache._wards;
}

// ---------- formatting ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enc = encodeURIComponent;
const NP = '<span class="np">Not published</span>';
const fmtN = n => Number(n).toLocaleString("en-IN");

function inr(v) {
  const n = Number(v);
  if (!n) return "";
  if (n >= 1e7) return "₹" + (n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: n >= 1e9 ? 0 : 2 }) + " cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " lakh";
  return "₹" + fmtN(n);
}

function date(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const titleCase = s => String(s || "").toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
// Names arrive in mixed case ("SHOBHA KARANDLAJE", "Shri LS Tejasvi Surya"); show them consistently.
const person = s => {
  const t = String(s || "").trim();
  return t === t.toUpperCase() ? titleCase(t) : t;
};
const FLAG = { overdue: "Overdue", past_estimate: "Past estimated finish" };
const badge = w => w.flag ? `<span class="badge ${w.flag}">${FLAG[w.flag]}</span>` : "";

function finishBy(w) {
  if (!w.deadline) return "";
  return w.deadline_basis === "official" ? date(w.deadline) : `${date(w.deadline)} <span class="muted">(est.)</span>`;
}

function wardLabel(city, w) {
  if (!w) return "";
  if (city === "bengaluru") return `${w.name} · ward ${w.no}, ${w.zone.replace("Bengaluru ", "").replace(" City Corporation", "")}`;
  return w.name;
}

// ---------- fuzzy search ----------
// Common ways people shorten or spell place words.
const SYNONYMS = [[/\brd\b/g, "road"], [/\bblk\b/g, "block"], [/\bcrs\b/g, "cross"], [/\bmn\b/g, "main"],
  [/\bstg\b/g, "stage"], [/\bnagara\b/g, "nagar"], [/\blyt\b/g, "layout"], [/\bblr\b|\bbangalore\b/g, "bengaluru"],
  [/\bbombay\b/g, "mumbai"], [/\bmadras\b/g, "chennai"]];

function normalise(q) {
  let s = String(q || "").toLowerCase().replace(/[^\p{L}\p{N}/ ]+/gu, " ");
  for (const [re, to] of SYNONYMS) s = s.replace(re, to);
  return s.replace(/\s+/g, " ").trim();
}

// Typo-tolerant word matching. Each query word must match a word in the record:
// exactly for numbers (PIN codes, "4th", ward numbers); otherwise with up to 1 typo for
// words of 4-7 letters and 2 for longer ones. The last word may also be the start of a
// word, since people are still typing it. Words that sound alike also match, because
// Indian place names are spelled many ways (Koramangala / Kormangala, Bangalore /
// Bengaluru): see soundKey. Matches in the first key (the name) rank higher.
function soundKey(t) {
  t = t.replace(/([bcdgjkpt])h/g, "$1").replace(/(.)\1+/g, "$1");
  return (t[0] + t.slice(1).replace(/[aeiouyw]/g, "")).replace(/(.)\1+/g, "$1");
}

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const indexCache = new WeakMap();
function wordIndex(list, keys) {
  let vocab = indexCache.get(list);
  if (!vocab) {
    const m = new Map();  // word -> Map(item position -> 0 if in the name, 0.5 otherwise)
    list.forEach((x, i) => keys.forEach((k, ki) => {
      for (const t of normalise(x[k]).split(" ")) {
        if (!t) continue;
        if (!m.has(t)) m.set(t, new Map());
        const w = ki === 0 ? 0 : 0.5, ids = m.get(t);
        if (!ids.has(i) || ids.get(i) > w) ids.set(i, w);
      }
    }));
    vocab = [...m.entries()].map(([t, ids]) => [t, soundKey(t), ids]);
    indexCache.set(list, vocab);
  }
  return vocab;
}

function fuzzy(list, query, keys, minPrefix = 3) {
  const words = normalise(query).split(" ").filter(Boolean);
  if (!words.length) return list;
  const vocab = wordIndex(list, keys);
  let scores = null;  // item position -> total cost
  words.forEach((w, n) => {
    if (scores && !scores.size) return;
    const digits = /\d/.test(w);
    const last = n === words.length - 1;
    const max = digits || w.length <= 3 ? 0 : w.length <= 7 ? 1 : 2;
    const spelled = new Map(), sounded = new Map();  // item position -> cost
    let exact = false;  // the word matched some record word exactly or as its start
    const wk = !digits && w.length >= 4 ? soundKey(w) : "";
    for (const [t, tk, ids] of vocab) {
      let d, target = spelled;
      if (t === w) d = 0;
      else if (last && t.startsWith(w) && (w.length >= minPrefix || digits)) d = 0.3;
      else if (max && (d = editDistance(w, t, max)) <= max) { /* typo within limit */ }
      else if (max && last && (d = editDistance(w, t.slice(0, w.length), max) + 0.3) <= max + 0.3) { /* typo in a prefix */ }
      else if (wk && tk === wk) { d = 0.5; target = sounded; }
      else if (wk && last && wk.length >= 3 && tk.startsWith(wk)) { d = 0.6; target = sounded; }
      else continue;
      if (d <= 0.3) exact = true;
      for (const [i, wt] of ids) if (!target.has(i) || target.get(i) > d + wt) target.set(i, d + wt);
    }
    // Sound-alike matches are a fallback: ignored when the word matched exactly.
    const best = spelled;
    if (!exact) for (const [i, d] of sounded) if (!best.has(i) || best.get(i) > d) best.set(i, d);
    if (!scores) scores = best;
    else {
      const next = new Map();
      for (const [i, d] of best) if (scores.has(i)) next.set(i, scores.get(i) + d);
      scores = next;
    }
  });
  return [...scores.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(([i]) => list[i]);
}

async function places() {
  if (!cache._places) cache._places = load("places.json").then(rows => rows.map(([kind, label, detail, href, extra]) =>
    ({ kind, label, detail, href, extra })));
  return cache._places;
}

// ---------- URL state ----------
let refocus = false;    // keep the cursor in a filter box after it updates the URL
let toResults = false;  // after a page change, scroll back to the top of the results

function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, "").split("?");
  return { parts: path.split("/").filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(qs || "") };
}

function setQuery(changes) {
  const { q } = parseHash();
  for (const [k, v] of Object.entries(changes)) {
    if (v === "" || v == null) q.delete(k); else q.set(k, v);
  }
  const path = location.hash.split("?")[0] || "#/";
  const s = q.toString();
  location.hash = s ? `${path}?${s}` : path;
}

// ---------- components ----------
function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([label, href]) =>
    href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`).join('<span class="sep">/</span>')}</nav>`;
}

function stats(items) {
  return `<dl class="stats">${items.filter(Boolean).map(([v, l]) =>
    `<div><dt>${l}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}

// Search box with suggestions as you type (places, wards, constituencies, MPs, PIN codes).
function searchBox(id, value = "") {
  return `<form class="searchbar" id="${id}" role="search" autocomplete="off">
    <div class="combo">
      <input class="input" name="q" type="search" value="${esc(value)}" placeholder="Area, street, ward, MP or PIN code"
        aria-label="Search" aria-autocomplete="list" aria-controls="${id}-list" aria-expanded="false">
      <ul class="suggest" id="${id}-list" role="listbox" hidden></ul>
    </div>
    <button class="btn primary" type="submit">Search</button>
  </form>`;
}

const KIND_ORDER = ["City", "Lok Sabha constituency", "State", "Ward", "Assembly constituency", "Town or district", "District", "PIN code"];

function wireSearch(id) {
  const form = document.getElementById(id);
  const input = form.q;
  const list = document.getElementById(id + "-list");
  let items = [], active = -1, t;
  places();  // start loading the place list now, so the first letters are instant
  const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; };
  const draw = () => {
    list.innerHTML = items.map((p, i) => `<li role="option" aria-selected="${i === active}">
      <a href="${p.href}"${p.action ? ` data-action="${p.action}"` : ""}>${p.kind ? `<span class="kind">${esc(p.kind)}</span> ` : ""}<b>${esc(p.label)}</b> <span class="muted small">${esc(p.detail || "")}</span></a></li>`).join("");
    list.hidden = !items.length;
    input.setAttribute("aria-expanded", String(!!items.length));
    list.querySelectorAll("[data-action=near]").forEach(a => {
      a.onclick = e => { e.preventDefault(); close(); nearMe(null, document.getElementById("nearout") || document.createElement("p")); };
    });
  };
  const quickPicks = async () => {
    const meta = await load("meta.json");
    return [{ label: "Use my location", detail: "find your ward", href: "#/", action: "near" },
      ...meta.cities.map(c => ({ kind: "City", label: c.name, detail: c.state, href: `#/city/${c.slug}` })),
      { kind: "Topic", label: "MP funds", detail: "find your MP or constituency", href: "#/mp" }];
  };
  const update = async () => {
    const v = input.value.trim();
    if (!v) { items = await quickPicks(); active = -1; draw(); return; }
    const all = await places();
    const hits = fuzzy(all, v, ["label", "detail", "extra"], 1).slice(0, 40);
    const nv = normalise(v);
    // Names that start with what was typed first, then by kind (cities and constituencies before wards).
    const rank = p => (normalise(p.label).startsWith(nv) ? 0 : 1) * 10 + Math.max(0, KIND_ORDER.indexOf(p.kind));
    items = hits.map((p, i) => [p, rank(p), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]).slice(0, 8);
    items.push({ label: `Search for “${v}”`, detail: "in all works", href: "#/search?q=" + enc(v) });
    active = -1;
    draw();
  };
  input.oninput = () => { clearTimeout(t); t = setTimeout(update, 80); };
  input.onfocus = () => update();
  input.onkeydown = e => {
    if (list.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      draw();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      list.querySelectorAll("a")[active].click();
    } else if (e.key === "Escape") close();
  };
  input.onblur = () => setTimeout(close, 250);
  form.onsubmit = e => { e.preventDefault(); close(); input.blur(); location.hash = "#/search?q=" + enc(input.value.trim()); };
}

// The standard results view: count, filter box, sort, filter chips, table, pagination.
// State lives in the URL so back/forward and shared links keep the same view.
function results(el, all, view) {
  const { q } = parseHash();
  const text = (q.get("q") || "").trim();
  const sortKey = view.sorts[q.get("sort")] ? q.get("sort") : (text ? "" : view.sort);
  const filter = view.filters[q.get("f")] ? q.get("f") : "";
  const base = filter ? all.filter(view.filters[filter][1]) : all;
  let list = fuzzy(base, text, view.keys);
  if (sortKey) list = list.slice().sort(view.sorts[sortKey][1]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, parseInt(q.get("page"), 10) || 1));
  const from = (page - 1) * PAGE_SIZE;
  const rows = list.slice(from, from + PAGE_SIZE);

  el.innerHTML = `
    <div class="toolbar">
      ${view.noFilterBox ? "" : `<input class="input" type="search" id="rq" value="${esc(text)}" placeholder="${esc(view.placeholder || "Filter these works")}" aria-label="Filter these ${view.noun || "works"}">`}
      <label class="select"><span>Sort</span><select id="rs">
        ${text ? `<option value=""${!sortKey ? " selected" : ""}>Best match</option>` : ""}
        ${Object.entries(view.sorts).map(([k, [l]]) => `<option value="${k}"${k === sortKey ? " selected" : ""}>${l}</option>`).join("")}
      </select></label>
    </div>
    <div class="chips" role="group" aria-label="Filter">${Object.entries(view.filters).map(([k, [l]]) =>
      `<button type="button" class="chip" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join("")}</div>
    <p class="count">${list.length ? `Showing ${fmtN(from + 1)}–${fmtN(from + rows.length)} of ${fmtN(list.length)} ${view.noun || "works"}` : `No ${view.noun || "works"} match. Try fewer or shorter words.`}</p>
    ${rows.length ? view.table(rows) : ""}
    ${pager(page, pages)}`;

  const rq = el.querySelector("#rq");
  if (rq) {
    let t;
    rq.oninput = () => { clearTimeout(t); t = setTimeout(() => { refocus = true; setQuery({ q: rq.value.trim(), page: "" }); }, 400); };
    if (refocus) { rq.focus(); rq.setSelectionRange(rq.value.length, rq.value.length); }
    refocus = false;
  }
  el.querySelector("#rs").onchange = e => setQuery({ sort: e.target.value, page: "" });
  el.querySelectorAll(".chip").forEach(b => { b.onclick = () => setQuery({ f: b.dataset.f, page: "" }); });
  el.querySelectorAll(".pager [data-page]").forEach(b => { b.onclick = () => { toResults = true; setQuery({ page: b.dataset.page }); }; });
}

function pager(page, pages) {
  if (pages <= 1) return "";
  const nums = [...new Set([1, pages, page - 1, page, page + 1])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  let html = "", prev = 0;
  for (const n of nums) {
    if (n - prev > 1) html += '<span class="gap">…</span>';
    html += n === page ? `<span class="current" aria-current="page">${n}</span>` : `<button type="button" data-page="${n}">${n}</button>`;
    prev = n;
  }
  return `<nav class="pager" aria-label="Pages">
    <button type="button" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>‹ Prev</button>
    ${html}
    <button type="button" data-page="${page + 1}" ${page === pages ? "disabled" : ""}>Next ›</button></nav>`;
}

// Road works view.
function roadView(where) {
  return {
    keys: ["title", "location_text", "place", "agency", "office", "contractor", "pincode"],
    placeholder: "Filter by street, area, contractor…",
    sort: "recent",
    sorts: {
      recent: ["Newest first", (a, b) => (b.published_date || b.first_seen).localeCompare(a.published_date || a.first_seen)],
      cost: ["Highest cost", (a, b) => b.cost - a.cost],
      paid: ["Most paid", (a, b) => b.paid - a.paid],
      finish: ["Finish date", (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999")],
    },
    filters: {
      "": ["All", () => true],
      late: ["Past finish date", w => !!w.flag],
      contractor: ["Contractor known", w => !!w.contractor],
      unknown: ["Contractor not published", w => !w.contractor],
    },
    table: rows => `<table class="works">
      <thead><tr><th>Work</th><th>Agency &amp; contractor</th><th class="num">Cost</th><th>Finish by</th><th>Status</th></tr></thead>
      <tbody>${rows.map(w => `<tr class="${w.flag}">
        <td data-label="Work"><a href="#/work/${enc(w.id)}">${esc(w.title)}</a> ${badge(w)}${where ? `<div class="sub">${where(w)}</div>` : ""}</td>
        <td data-label="Agency"><div>${esc(w.agency) || NP}</div><div class="sub">${w.contractor ? esc(w.contractor) : "Contractor not published"}</div></td>
        <td data-label="Cost" class="num">${inr(w.sanctioned_cost) || (w.paid ? `<span class="sub">paid</span> ${inr(w.paid)}` : NP)}</td>
        <td data-label="Finish by">${finishBy(w) || NP}</td>
        <td data-label="Status">${esc(w.status).replace(/\d{4}-\d{2}-\d{2}/, date) || NP}</td></tr>`).join("")}</tbody></table>`,
  };
}

// MPLADS view.
const STAGE_DONE = s => s === "Work Completed";
// MoSPI: "sanctioned works are generally required to be completed within one year of sanction".
const YEAR_AGO = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
const overYear = w => !!w.sanction_date && w.sanction_date < YEAR_AGO && !STAGE_DONE(w.stage);
const yearBadge = w => overYear(w) ? '<span class="badge past_estimate">Over a year since sanction</span>' : "";
const STAGE_PENDING = s => /pending/i.test(s || "") || !s;
function mpView(stateSlug, showConstituency) {
  return {
    keys: ["description", "activity", "implementing_agency", "letter_no", "constituency", "mp_name"],
    placeholder: "Filter by place, school, road, agency…",
    sort: "recent",
    sorts: {
      recent: ["Newest first", (a, b) => (b.recommended_date || b.sanction_date).localeCompare(a.recommended_date || a.sanction_date)],
      amount: ["Highest amount", (a, b) => b.amount - a.amount],
    },
    filters: {
      "": ["All", () => true],
      done: ["Completed", w => STAGE_DONE(w.stage)],
      going: ["In progress", w => !STAGE_DONE(w.stage) && !STAGE_PENDING(w.stage)],
      late: ["Over a year since sanction", overYear],
      pending: ["Awaiting sanction", w => STAGE_PENDING(w.stage)],
    },
    table: rows => `<table class="works">
      <thead><tr><th>Work</th><th>Type</th><th class="num">Amount</th><th>Recommended</th><th>Stage</th></tr></thead>
      <tbody>${rows.map(w => `<tr>
        <td data-label="Work"><a href="#/mpwork/${stateSlug}/${enc(w.id)}">${esc(w.description || w.activity)}</a> ${yearBadge(w)}
          ${showConstituency ? `<div class="sub">${esc(w.constituency)} · ${esc(person(w.mp_name))}</div>` : ""}</td>
        <td data-label="Type">${esc(w.activity) || NP}</td>
        <td data-label="Amount" class="num">${inr(w.amount) || NP}</td>
        <td data-label="Recommended">${date(w.recommended_date) || NP}</td>
        <td data-label="Stage">${esc(w.stage) || NP}</td></tr>`).join("")}</tbody></table>`,
  };
}

// MLA funds view.
const MLA_DONE = s => s === "Completed";
const MLA_NOT_STARTED = s => s === "Not Started";
// Recommended by the MLA, not yet sanctioned: "Pending with MLA / Collector / ZP / EA".
const MLA_AWAITING = s => /^Pending with/i.test(s || "");
function mlaView(stateSlug, showConstituency) {
  return {
    keys: ["name", "category", "constituency", "district", "project_code"],
    placeholder: "Filter by village, temple, school, road…",
    sort: "amount",
    sorts: {
      amount: ["Highest amount", (a, b) => b.amount - a.amount],
      spent: ["Most spent", (a, b) => b.spent - a.spent],
      code: ["Project code", (a, b) => a.project_code.localeCompare(b.project_code)],
    },
    filters: {
      "": ["All", () => true],
      done: ["Completed", w => MLA_DONE(w.status)],
      going: ["Started or in progress", w => /^(started|in progress)$/i.test(w.status)],
      notstarted: ["Not started", w => MLA_NOT_STARTED(w.status)],
      awaiting: ["Awaiting sanction", w => MLA_AWAITING(w.status)],
      road: ["Roads", w => w.component === "Road"],
      edu: ["Education", w => w.component === "Education"],
    },
    table: rows => `<table class="works">
      <thead><tr><th>Work</th><th>Type</th><th class="num">Sanctioned</th><th class="num">Spent</th><th>Status</th></tr></thead>
      <tbody>${rows.map(w => `<tr>
        <td data-label="Work"><a href="#/mlawork/${stateSlug}/${enc(w.id)}">${esc(w.name)}</a>
          ${showConstituency ? `<div class="sub">${esc(w.constituency)} · ${esc(w.district)} district</div>` : ""}</td>
        <td data-label="Type">${esc(w.category) || NP}</td>
        <td data-label="Sanctioned" class="num">${inr(w.sanction_amount) || (w.recommended_amount ? `${inr(w.recommended_amount)} <span class="sub">recommended</span>` : NP)}</td>
        <td data-label="Spent" class="num">${inr(w.spent) || "₹0"}</td>
        <td data-label="Status">${esc(w.status) || NP}</td></tr>`).join("")}</tbody></table>`,
  };
}

// ---------- maps ----------
let maps = [];
function newMap(id) {
  const el = document.getElementById(id);
  if (typeof L === "undefined") {
    el.innerHTML = '<p class="muted small pad">Map could not be loaded.</p>';
    return null;
  }
  const m = L.map(id, { scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(m);
  maps.push(m);
  return m;
}

function shade(n, max) {
  const css = getComputedStyle(document.documentElement);
  if (!n) return css.getPropertyValue("--map0");
  const r = n / Math.max(max, 1);
  return css.getPropertyValue(r > .5 ? "--map3" : r > .2 ? "--map2" : "--map1");
}

// Point-in-polygon for "use my location" (GeoJSON [lon, lat], ray casting).
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inGeometry(x, y, g) {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  return polys.some(p => inRing(x, y, p[0]) && !p.slice(1).some(h => inRing(x, y, h)));
}

async function nearMe(btn, out) {
  if (!navigator.geolocation) { out.textContent = "Your browser cannot share location."; return; }
  if (btn) btn.disabled = true;
  out.textContent = "Finding your location…";
  navigator.geolocation.getCurrentPosition(async pos => {
    const { longitude: x, latitude: y } = pos.coords;
    const meta = await load("meta.json");
    for (const c of meta.cities) {
      const geo = await load(`wards/${c.slug}.geojson`);
      const f = geo.features.find(f => inGeometry(x, y, f.geometry));
      if (f) { location.hash = `#/city/${c.slug}/ward/${enc(f.properties.ward_key)}`; return; }
    }
    if (btn) btn.disabled = false;
    out.textContent = `You're outside the cities that have ward maps so far (${meta.cities.map(c => c.name).join(", ")}). Try searching your town or PIN code.`;
  }, () => {
    if (btn) btn.disabled = false;
    out.textContent = "Location not available. Search by area or PIN code instead.";
  }, { enableHighAccuracy: true, timeout: 15000 });
}

// Plain-language explanations shown under each field on detail pages.
const HELP = {
  // MLA funds
  "Assembly constituency": "The Vidhan Sabha constituency whose MLA recommended the work.",
  "Project code": "The portal's own number for this work. Quote it to find the work on the portal, or in an RTI or complaint.",
  "Kind of work": "The category the scheme's guidelines put the work in, and which share of the MLA's fund it comes from (general, roads or education).",
  "Carried out by": "The department that executes the work, usually Panchayati Raj through the block office.",
  "Amount sanctioned": "The amount approved for the work.",
  "Spent so far": "Money spent on the work as shown on the portal. It often lags behind what is happening at the site.",
  "Time allowed": "The number of days the portal gives for finishing the work. It does not show the start date, so we cannot tell if it is late.",
  "Work status": "As the portal shows it. \"Pending with MLA, Collector, ZP or EA\" means the MLA has recommended the work and it is waiting for approval or sanction at that office (ZP: Zilla Parishad; EA: the executing agency). Then: not started, started or in progress, completed, or rejected.",
  "MLA": "The MLA who recommended the work, from the portal's MLA-wise report.",
  "Recommended": "The date and number of the MLA's recommendation letter, and the amount the MLA asked for.",
  "Sanctioned on": "The date the district sanctioned the work, which releases the money for it.",
  "Implementing agency": "The officer or office responsible for carrying out the work.",
  "Where": "The block or urban local body, and the village or ward, as the portal gives them.",
  // road works
  "Agency": "The government body that issued the tender or work order, such as a city corporation or the PWD.",
  "Office": "The zone, division or office inside that body that handles the work.",
  "Contractor": "The firm or person given the work. Tender portals show it only after the award, and some hide it behind a captcha.",
  "Sanctioned cost": "The money approved for the work. Which figure it is (tender estimate, tender value) is noted beside it.",
  "Amount paid": "Bills paid to the contractor so far, from the city's accounts.",
  "Tender published": "When the agency invited contractors to bid.",
  "Start or award date": "When the contract was awarded or the work order issued.",
  "Period of work": "How long the contractor has to finish, as written in the tender.",
  "Finish by": "When the work should be done. \"(est.)\" means we worked it out from the bid opening date plus the period of work.",
  "Status": "The stage the source shows, such as open for bids, awarded, bill paid or cancelled.",
  "Ward": "The ward the work is in, and how we know it.",
  "Location in source": "The location words exactly as the official record gives them.",
  "Place": "Town or district, PIN code and state, as the source gives them.",
  // MPLADS
  "MP": "The Member of Parliament who recommended this work from their MPLADS fund (₹5 crore a year).",
  "Constituency": "The Lok Sabha constituency the MP represents.",
  "Type of work": "The kind of work, from the list of works the MPLADS guidelines allow. The number refers to that list.",
  "Category": "\"Normal/Others\" is a regular new work. \"Repair and Renovation\" is upkeep of an existing asset. \"Trust and Society\" is a work for a registered trust or society, which the rules allow within limits.",
  "District authority": "The Implementing District Authority (IDA), usually the District Collector or Deputy Commissioner's office. It checks the MP's recommendation, sanctions the work, chooses who carries it out and pays for it.",
  "Recommended": "When the MP proposed the work, and the amount they asked for.",
  "Sanctioned": "When the district authority approved the work, and the amount approved. Until then the work is only a proposal.",
  "Stage": "Where the work stands on the official portal. The MPLADS guide explains each stage.",
  "Completed": "When the work was marked complete, and the money actually spent.",
  "Recommendation letter": "The reference number of the MP's letter proposing the work. Quote it to find the work on the official portal, or in an RTI or complaint.",
};
const fieldRow = (label, val) => `<tr><th scope="row">${label}${HELP[label] ? `<span class="help">${HELP[label]}</span>` : ""}</th><td>${val || NP}</td></tr>`;

// ---------- "Ask about this work": ready-to-send RTI applications and complaints ----------
// Drafts are plain text built from the record. Every field the source leaves out becomes a
// question. Nothing is sent from here: people copy, download or print the letter themselves.
const ME_KEY = "nagarika-me";
function loadMe() {
  try { return JSON.parse(localStorage.getItem(ME_KEY)) || {}; } catch { return {}; }
}
function saveMe(me) {
  try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch { /* private mode: nothing to do */ }
}
const todayText = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const numbered = items => items.filter(Boolean).map((t, i) => `${i + 1}. ${t}`).join("\n");

function signOff(me) {
  return [
    `Place: ${me.place || "[your town or city]"}`,
    `Date: ${todayText()}`,
    "",
    "Yours faithfully,",
    "",
    me.name || "[Your full name]",
    me.address || "[Your postal address]",
    me.contact || "[Phone or email, optional]",
  ].join("\n");
}

const RTI_CLOSE = [
  "I am a citizen of India. I am paying the application fee of Rs 10 by [postal order / demand draft / court-fee stamp / online payment, as your office accepts]. (If you are below the poverty line, write instead: I am exempt from the fee and enclose a copy of my BPL certificate.)",
  "I would prefer to receive the information as certified copies, sent to the address below. I will pay the copying charges you tell me.",
  "If any of this information is held by another public authority, please transfer this application to it under section 6(3) of the Act and let me know.",
].join("\n\n");

function rtiLetter(to, subject, intro, asks, me) {
  return [
    "To,", to, "",
    `Subject: ${subject}`, "",
    "Sir or Madam,", "",
    intro, "",
    "Information sought:",
    numbered(asks), "",
    RTI_CLOSE, "",
    signOff(me),
  ].join("\n");
}

function roadRef(w) {
  return [
    `Work: ${w.title}`,
    `Reference number: ${w.source_id}${w.source.startsWith("gepnic") || w.source === "kppp" ? " (tender ID)" : " (work order)"}`,
    w.agency ? `Agency: ${[w.agency, w.office].filter(Boolean).join(", ")}` : "",
    w.contractor ? `Contractor (as published): ${w.contractor}` : "",
    w.sanctioned_cost ? `Cost (as published): ${inr(w.sanctioned_cost)} (${w.cost_basis})` : "",
    w.location_text || w.place ? `Location: ${[...new Set([w.location_text, w.place, w.pincode])].filter(x => x && x !== w.office).join(", ") || w.location_text}` : "",
  ].filter(Boolean).join("\n");
}

function roadOffice(w) {
  return [`The Public Information Officer`, w.office ? w.office.split(" / ").pop() : "", w.agency || "[name of the agency]",
    [w.place, w.state].filter(Boolean).join(", ")].filter(Boolean).join("\n");
}

function roadRti(w, me) {
  const official = w.deadline_basis === "official";
  const asks = [
    "A certified copy of the work order or agreement for this work, with the approved estimate, the bill of quantities and the scope of work.",
    w.contractor ? `The date on which the work was awarded to ${w.contractor}.` : "The name and address of the contractor to whom the work was awarded, and the date of award.",
    w.start_date ? "" : "The date on which the work actually started at the site.",
    official ? `Copies of any orders extending the completion date of ${date(w.deadline)}, with the reasons recorded in them.`
      : "The completion date fixed in the agreement, and copies of any orders extending it, with the reasons recorded in them.",
    `The total amount paid to the contractor so far for this work${w.amount_paid ? ` (published as ${inr(w.amount_paid)})` : ""}, with the date and amount of each bill paid.`,
    "The present status of the work. If it is not complete, copies of the records showing the reasons for the delay and any penalty imposed on the contractor.",
    "The name and designation of the engineer in charge of this work.",
    "Copies of the quality test reports for this work, and the defect liability period in the agreement.",
    "Under section 2(j) of the Act, I also wish to inspect the measurement book and other records of this work. Please tell me a date and time.",
  ];
  return rtiLetter(roadOffice(w), "Application for information under section 6(1) of the Right to Information Act, 2005",
    `I request the following information about this public work:\n\n${roadRef(w)}`, asks, me);
}

function roadComplaint(w, me) {
  const to = [`The Executive Engineer (or the officer in charge of this work)`, w.office ? w.office.split(" / ").pop() : "",
    w.agency || "[name of the agency]", [w.place, w.state].filter(Boolean).join(", ")].filter(Boolean).join("\n");
  const due = w.deadline ? `The finish date ${w.deadline_basis === "official" ? "in the official record" : "estimated from the tender"} is ${date(w.deadline)}.` : "No finish date has been published for this work.";
  return [
    "To,", to, "",
    `Subject: Status of work ${w.source_id}: ${w.title.slice(0, 90)}${w.title.length > 90 ? "…" : ""}`, "",
    "Sir or Madam,", "",
    "I am writing about this public work in my area:", "",
    roadRef(w), "",
    due, "",
    "What I see at the site: [describe it, for example: the road has been dug up since (date), work has stopped, there are no barricades or signboards].", "",
    "I request you to:",
    numbered([
      "Tell me the date by which this work will be completed.",
      "Put up barricades and warning signs at the site until the work is finished.",
      "Restore the road surface properly once the work is done.",
      "Display a board at the site with the name of the work, the contractor, the cost and the completion date.",
    ]), "",
    "Please reply within 15 days. If I do not hear from you, I will seek these details under the Right to Information Act, 2005.", "",
    signOff(me),
  ].join("\n");
}

function mpRef(w) {
  return [
    `Work: ${w.description || w.activity}`,
    `Recommended by: ${person(w.mp_name)}, MP, ${w.constituency} (${w.tenure})`,
    `Recommendation letter: ${w.letter_no}${w.recommended_date ? ` dated ${date(w.recommended_date)}` : ""}`,
    w.recommended_amount ? `Amount recommended: ${inr(w.recommended_amount)}` : "",
    w.sanction_date ? `Sanctioned on: ${date(w.sanction_date)}${w.sanction_amount ? `, ${inr(w.sanction_amount)}` : ""}` : "",
    w.stage ? `Stage on the eSAKSHI portal: ${w.stage}` : "",
  ].filter(Boolean).join("\n");
}

// "BAGALKOTE(Deputy Commissioner Bagalkot_ida)" -> "Bagalkote, Karnataka"
const mpDistrict = w => [titleCase((w.implementing_agency || "").split("(")[0].trim()), w.state].filter(Boolean).join(", ") || "[district]";
function mpOffice(w) {
  return ["The Public Information Officer", "MPLADS cell, Office of the District Collector / Deputy Commissioner", mpDistrict(w)].join("\n");
}

function mpRti(w, me) {
  const pending = STAGE_PENDING(w.stage);
  const asks = pending ? [
    "The date on which your office received this recommendation.",
    "The present status of the recommendation, and copies of any notes or letters on it, including any objection or request for changes.",
    "If it has been rejected or returned, a copy of the order with the reasons recorded.",
  ] : [
    "A certified copy of the sanction order for this work, with the approved estimate.",
    "The name of the implementing agency, and the name of the contractor or vendor carrying out the work, with a copy of the work order.",
    "The amounts released for this work so far, with dates, and copies of the utilisation certificates received.",
    STAGE_DONE(w.stage) ? "A copy of the completion certificate, and photographs of the completed asset."
      : `The present status of the work and the expected completion date. ${overYear(w) ? "The MPLADS guidelines expect sanctioned works to be completed within one year; please give copies of the records showing the reasons for the delay." : ""}`.trim(),
    "Copies of inspection reports for this work.",
    "Under section 2(j) of the Act, I also wish to inspect the file for this work. Please tell me a date and time.",
  ];
  return rtiLetter(mpOffice(w), "Application for information under section 6(1) of the Right to Information Act, 2005 (MPLADS work)",
    `I request the following information about this work under the Members of Parliament Local Area Development Scheme:\n\n${mpRef(w)}`, asks, me);
}

function mpComplaint(w, me) {
  return [
    "To,", "The District Collector / Deputy Commissioner (MPLADS cell)", mpDistrict(w), "",
    `Copy to: ${person(w.mp_name)}, MP, ${w.constituency}; MPLADS Division, Ministry of Statistics and Programme Implementation (cna-mplads@mospi.gov.in)`, "",
    `Subject: Status of MPLADS work, letter ${w.letter_no}`, "",
    "Sir or Madam,", "",
    "I am writing about this MPLADS work:", "",
    mpRef(w), "",
    overYear(w) ? `It was sanctioned more than a year ago and is not shown as completed. The MPLADS guidelines say sanctioned works are generally to be completed within one year of sanction.\n` : "",
    "What I see at the site: [describe it, for example: work not started, work stopped, asset built but not in use].", "",
    "I request you to:",
    numbered([
      "Tell me the present status of this work and the date by which it will be completed.",
      "Update the stage of this work on the eSAKSHI portal, so that citizens can follow it.",
      "Display a board at the site saying that the work is funded under MPLADS, with its cost.",
    ]), "",
    "Please reply within 15 days. If I do not hear from you, I will seek these details under the Right to Information Act, 2005.", "",
    signOff(me),
  ].join("\n");
}

// The panel shown on a work page. drafts: [[key, tab label, builder(me) -> text], ...]
function askPanel(intro) {
  return `<section class="ask" id="ask">
    <h2>Ask about this work</h2>
    <p>${intro} Fill in your details, check the letter and edit it if you like, then copy, download or print it. <a href="#/guides/rti">How to file an RTI</a></p>
    <div class="chips" role="tablist" id="asktabs"></div>
    <div class="askgrid">
      <label>Your name<input class="input" id="me-name" autocomplete="name"></label>
      <label>Town or city<input class="input" id="me-place" autocomplete="address-level2"></label>
      <label class="wide">Postal address<textarea class="input" id="me-address" rows="2" autocomplete="street-address"></textarea></label>
      <label class="wide">Phone or email <span class="muted small">(optional)</span><input class="input" id="me-contact"></label>
    </div>
    <textarea class="input draft" id="draft" rows="18" aria-label="Letter"></textarea>
    <div class="askbtns">
      <button type="button" class="btn primary" id="ask-copy">Copy</button>
      <button type="button" class="btn" id="ask-dl">Download</button>
      <button type="button" class="btn" id="ask-print">Print</button>
      <button type="button" class="link" id="ask-reset" hidden>Undo my edits</button>
      <span class="muted small" id="ask-msg" aria-live="polite"></span>
    </div>
    <p class="muted small">Your details stay on this device; Nagarika does not receive or send anything. Check the facts against the official record before you send the letter. This is a template, not legal advice.</p>
  </section>`;
}

function wireAsk(drafts, fileStem) {
  const me = loadMe();
  const ids = ["name", "place", "address", "contact"];
  const box = document.getElementById("draft");
  const reset = document.getElementById("ask-reset");
  const msg = document.getElementById("ask-msg");
  let current = drafts[0][0], edited = false;
  const build = () => drafts.find(d => d[0] === current)[2](me);
  const draw = () => { box.value = build(); edited = false; reset.hidden = true; };
  const tabs = document.getElementById("asktabs");
  tabs.innerHTML = drafts.map(([k, label]) => `<button type="button" class="chip" role="tab" data-k="${k}" aria-pressed="${k === current}">${esc(label)}</button>`).join("");
  tabs.querySelectorAll(".chip").forEach(b => {
    b.onclick = () => {
      if (edited && !confirm("Switching letters will discard your edits. Continue?")) return;
      current = b.dataset.k;
      tabs.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    };
  });
  for (const id of ids) {
    const el = document.getElementById("me-" + id);
    el.value = me[id] || "";
    el.oninput = () => {
      me[id] = el.value.trim();
      saveMe(me);
      if (!edited) box.value = build();
    };
  }
  box.oninput = () => { edited = true; reset.hidden = false; };
  reset.onclick = draw;
  const say = t => { msg.textContent = t; setTimeout(() => { msg.textContent = ""; }, 3000); };
  document.getElementById("ask-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(box.value); say("Copied."); }
    catch { box.select(); document.execCommand("copy"); say("Copied."); }
  };
  document.getElementById("ask-dl").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([box.value], { type: "text/plain;charset=utf-8" }));
    a.download = `${fileStem}-${current}.txt`.replace(/[^\w.-]+/g, "-");
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  document.getElementById("ask-print").onclick = () => {
    const win = window.open("", "_blank");
    if (!win) { say("Allow pop-ups to print, or use Download."); return; }
    win.document.write(`<!doctype html><meta charset="utf-8"><title>Letter</title><pre style="white-space:pre-wrap;font:12pt/1.5 Georgia,serif;margin:2cm">${esc(box.value)}</pre>`);
    win.document.close();
    win.focus();
    win.print();
  };
  draw();
}

// ---------- where to complain ----------
// Official complaint channels by place. Numbers change: each entry records where it was
// confirmed and when, and the site shows that next to it.
const CHANNELS = {
  bengaluru: [
    { name: "GBA helpline (toll-free)", how: "Call 1533, or 080-22221188", what: "Potholes, waterlogging, fallen trees, streetlights, garbage",
      src: "https://x.com/GBA_office/status/2060368453664731506", checked: "2026-10-25" },
  ],
  chennai: [
    { name: "Greater Chennai Corporation helpline", how: "Call 1913", what: "Roads, drains, streetlights, garbage",
      src: "https://citizenmatters.in/chennai-citizen-clinic-1913-namma-chennai-rwa-complaints-activists/", checked: "2026-10-25" },
    { name: "Namma Chennai app", how: "Android and iPhone", what: "Complaints with a photo and location; you can track them",
      src: "https://citizenmatters.in/chennai-citizen-clinic-1913-namma-chennai-rwa-complaints-activists/", checked: "2026-10-25" },
  ],
  mumbai: [
    { name: "BMC helpline", how: "Call 1916", what: "Potholes, drains, water, garbage",
      src: "https://citizenmatters.in/accountability-how-to-raise-complaints-with-the-bmc", checked: "2026-10-25" },
    { name: "MyBMC 24x7 app", how: "Android and iPhone", what: "Complaints with a photo; you can track them",
      src: "https://citizenmatters.in/accountability-how-to-raise-complaints-with-the-bmc", checked: "2026-10-25" },
  ],
  roads: [
    { name: "National highways helpline (NHAI)", how: "Call 1033", what: "Only for national highways: potholes, accidents, toll plazas" },
  ],
  national: [
    { name: "CPGRAMS", how: '<a href="https://pgportal.gov.in" target="_blank" rel="noopener">pgportal.gov.in</a>', what: "Grievances against central government offices; it also forwards grievances to state governments. You get a number to track the reply." },
    { name: "RTI", how: '<a href="#/guides/rti">How to file</a>', what: "When you need the records, not just a fix" },
  ],
  mla_odisha: [
    { name: "MLALADS cell, Planning & Convergence Department, Odisha", how: '<a href="mailto:mlalads@odishaone.gov.in">mlalads@odishaone.gov.in</a>, 0674-2390336',
      what: "Questions about MLALADS works anywhere in Odisha", src: "https://mlalads.odisha.gov.in/", checked: "2026-10-25" },
    { name: "Block Development Officer", how: "The block office where the work is", what: "Most MLALADS works are carried out by the Panchayati Raj department through blocks" },
  ],
  mp: [
    { name: "District authority (MPLADS cell)", how: "The Collector or Deputy Commissioner's office named on the work", what: "Sanction, delays, payments and completion of MPLADS works" },
    { name: "MoSPI (runs MPLADS)", how: '<a href="mailto:cna-mplads@mospi.gov.in">cna-mplads@mospi.gov.in</a>', what: "When the district does not respond" },
    { name: "Suggest a work to your MP", how: '<a href="#/guides/mplads">Citizen Request on eSAKSHI</a>', what: "Ask your MP to fund a work in your area" },
  ],
};

function complainBox(keys, where) {
  const items = keys.flatMap(k => CHANNELS[k] || []);
  if (!items.length) return "";
  return `<section class="complain"><h2>Where to complain${where ? ` in ${esc(where)}` : ""}</h2>
    <ul class="channels">${items.map(c => `<li><b>${esc(c.name)}</b>: ${c.how}<div class="muted small">${esc(c.what)}${c.src
      ? ` · <a href="${esc(c.src)}" target="_blank" rel="noopener">source</a>, checked ${date(c.checked)}` : ""}</div></li>`).join("")}</ul>
    <p class="muted small">Note the complaint number you are given. If nothing happens, an <a href="#/guides/rti">RTI</a> asks the office for the action taken. Wrong or out-of-date number? <a href="${REPO}/issues/new?title=${enc("Complaint channel: " + (where || "national"))}">Tell us</a>.</p></section>`;
}

// ---------- pages: home and search ----------
async function home() {
  const [meta, mp, mla] = await Promise.all([load("meta.json"), load("mplads_index.json").catch(() => []),
    load("mlalads_index.json").catch(() => [])]);
  const mpWorksN = mp.reduce((a, s) => a + s.works, 0);
  const mlaWorksN = mla.reduce((a, s) => a + s.works, 0);
  const counts = { roads: `${fmtN(meta.total)} works`, mp: mpWorksN ? `${fmtN(mpWorksN)} works` : "",
    mla: mlaWorksN ? `${fmtN(mlaWorksN)} works` : "" };
  app.innerHTML = `
    <section class="hero">
      <h1>What is being built near you, and by whom?</h1>
      <p class="lede">Public works across India from official records: who is doing the work, what it costs and when it should finish. Every entry links to its source.</p>
      ${searchBox("hs")}
      <div class="near"><button type="button" class="btn" id="near">Use my location</button>
        <span class="examples">or try ${["Koramangla", "Jaynagar", "Marina", "K/E ward", "560034", "Tejasvi Surya"].map(x =>
          `<a href="#/search?q=${enc(x)}">${esc(x)}</a>`).join(" · ")}</span></div>
      <p class="muted small" id="nearout" aria-live="polite"></p>
    </section>
    <section>
      <h2>Topics</h2>
      <div class="cards topics">${TOPICS.filter(t => t.live).map(t =>
        `<a class="card live" href="${t.href}"><h3>${esc(t.name)}</h3><p>${esc(t.blurb)}</p>${counts[t.key] ? `<p class="tag">${counts[t.key]}</p>` : ""}</a>`).join("")}</div>
      <h3 class="soonhead">Coming next</h3>
      <div class="cards topics soonlist">${TOPICS.filter(t => !t.live).map(t =>
        `<div class="card soon"><h3>${esc(t.name)}</h3><span class="tag">Coming soon</span></div>`).join("")}</div>
    </section>
    <p class="muted small">Updated ${date(meta.last_checked)} · <a href="#/about">How this works</a> · <a href="data/works.csv">Download data</a></p>`;
  wireSearch("hs");
  const near = document.getElementById("near");
  near.onclick = () => nearMe(near, document.getElementById("nearout"));
}

async function search() {
  const { q } = parseHash();
  const text = (q.get("q") || "").trim();
  const [all, list] = await Promise.all([places(), works()]);
  const hits = text ? fuzzy(all, text, ["label", "detail", "extra"]).slice(0, 12) : [];
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Search"]])}
    ${searchBox("ss", text)}
    ${hits.length ? `<h2>Places</h2><ul class="placehits">${hits.map(p =>
      `<li><a href="${p.href}"><span class="kind">${esc(p.kind)}</span> <b>${esc(p.label)}</b></a> <span class="muted small">${esc(p.detail)}</span></li>`).join("")}</ul>` : ""}
    <h2>Road works</h2>
    <div id="res"></div>
    <p class="muted small">MP fund works are listed by constituency: open one above, or browse <a href="#/mp">MP funds</a>.</p>`;
  wireSearch("ss");
  const cityName = s => ({ bengaluru: "Bengaluru", chennai: "Chennai", mumbai: "Mumbai" })[s] || s;
  results(document.getElementById("res"), list, { ...roadView(w => esc(w.city ? cityName(w.city) : [w.place, w.state].filter(Boolean).join(", "))), noFilterBox: true });
}

// ---------- pages: road works ----------
async function roadsHome() {
  const meta = await load("meta.json");
  const states = Object.entries(meta.states).sort((a, b) => b[1].works - a[1].works);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works"]])}
    <h1>Road works</h1>
    <p class="lede">Why is my road dug up? Tenders and work orders for roads, footpaths and drains, with the agency, contractor, cost and finish date.</p>
    ${stats([[fmtN(meta.total), "Works"], [fmtN(Object.keys(meta.states).length), "States"], [`<a href="#/overdue">${fmtN(Object.values(meta.states).reduce((a, s) => a + s.flagged, 0))}</a>`, "Past finish date"]])}
    <h2>Cities with ward maps</h2>
    <div class="cards">${meta.cities.map(c => `
      <a class="card" href="#/city/${c.slug}"><h3>${esc(c.name)}</h3>
        <p>${fmtN(c.works)} works · ${c.wards} wards${c.overdue ? ` · ${fmtN(c.overdue)} past finish date` : ""}</p></a>`).join("")}</div>
    <h2>By state</h2>
    <p class="muted small">Outside the cities above, works are listed by town or district, as the source gives it.</p>
    <table class="plain stack"><thead><tr><th>State</th><th class="num">Works</th><th class="num">Past finish date</th></tr></thead>
    <tbody>${states.map(([s, v]) => `<tr><td><a href="#/state/${enc(s)}">${esc(s)}</a></td><td class="num" data-label="Works">${fmtN(v.works)}</td><td class="num" data-label="Past finish date">${fmtN(v.flagged)}</td></tr>`).join("")}</tbody></table>`;
}

async function city(slug) {
  const [meta, list, wards, geo] = await Promise.all([load("meta.json"), works(), wardLookup(), load(`wards/${slug}.geojson`)]);
  const c = meta.cities.find(x => x.slug === slug);
  if (!c) return notFound();
  const { q } = parseHash();
  const cw = list.filter(w => w.city === slug);
  const per = {};
  cw.forEach(w => w.wards.forEach(k => { per[k] = (per[k] || 0) + 1; }));
  const max = Math.max(0, ...Object.values(per));
  const wsort = q.get("wsort") === "works" ? "works" : "name";
  const wl = Object.values(wards[slug] || {}).sort(wsort === "works"
    ? (a, b) => (per[b.key] || 0) - (per[a.key] || 0) : (a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works", "#/roads"], [c.name]])}
    <h1>Road works in ${esc(c.name)}</h1>
    ${stats([[fmtN(cw.length), "Works"], [inr(c.cost) || "—", "Sanctioned, where published"],
      [inr(c.paid) || "—", "Paid, where published"], [fmtN(c.overdue), "Past finish date"]])}
    <div class="split">
      <div>
        <div id="citymap" class="map"></div>
        <div class="legend"><span><i style="background:var(--map0)"></i>None found</span><span><i style="background:var(--map1)"></i>Few</span><span><i style="background:var(--map2)"></i>Some</span><span><i style="background:var(--map3)"></i>Many</span></div>
        <p class="muted small">${esc(c.ward_map)} · <a href="${esc(c.ward_map_source)}">map source</a></p>
      </div>
      <div>
        <div class="toolbar"><input class="input" id="wq" type="search" placeholder="Find a ward (typos are fine)" aria-label="Find a ward">
          <label class="select"><span>Sort</span><select id="ws"><option value="name">Name</option><option value="works"${wsort === "works" ? " selected" : ""}>Most works</option></select></label></div>
        <div class="scrollbox"><table class="plain" id="wt"><thead><tr><th>Ward</th><th class="num">Works</th></tr></thead><tbody></tbody></table></div>
        <p class="small"><a href="#/city/${slug}/cards">Ward report cards: compare all wards</a></p>
        <p class="small"><a href="#/city/${slug}/ward/_none">${fmtN(c.unmatched)} works with no ward named in the source</a></p>
      </div>
    </div>
    <h2>All works in ${esc(c.name)}</h2>
    <div id="res"></div>
    ${complainBox([slug, "roads", "national"], c.name)}`;
  const drawWards = t => {
    const shown = t ? fuzzy(wl, t, ["name", "no", "assembly"], 1) : wl;
    document.querySelector("#wt tbody").innerHTML = shown.map(w =>
      `<tr><td><a href="#/city/${slug}/ward/${enc(w.key)}">${esc(wardLabel(slug, w))}</a></td><td class="num">${per[w.key] || 0}</td></tr>`).join("");
  };
  drawWards("");
  document.getElementById("wq").oninput = e => drawWards(e.target.value);
  document.getElementById("ws").onchange = e => setQuery({ wsort: e.target.value === "name" ? "" : e.target.value });
  results(document.getElementById("res"), cw, roadView(w =>
    w.wards.map(k => wards[slug][k] ? esc(wards[slug][k].name) : "").filter(Boolean).slice(0, 3).join(", ") || "Ward not named"));
  const m = newMap("citymap");
  if (!m) return;
  const layer = L.geoJSON(geo, {
    style: f => ({ weight: .8, color: "#666", fillOpacity: .75, fillColor: shade(per[f.properties.ward_key], max) }),
    onEachFeature: (f, l) => {
      const w = wards[slug][f.properties.ward_key];
      l.bindTooltip(`${esc(wardLabel(slug, w))}: ${per[f.properties.ward_key] || 0} works`);
      l.on("click", () => { location.hash = `#/city/${slug}/ward/${enc(f.properties.ward_key)}`; });
    },
  }).addTo(m);
  m.fitBounds(layer.getBounds());
}

// ---------- ward report cards ----------
// Per-ward totals and ranks for a city, from the road works found so far.
const CARD_METRICS = {
  works: ["Road works", n => fmtN(n)],
  cost: ["Sanctioned, where published", n => inr(n) || "—"],
  paid: ["Paid, where published", n => inr(n) || "—"],
  late: ["Past finish date", n => fmtN(n)],
};
async function wardCards(slug) {
  const ck = "_cards_" + slug;
  if (!cache[ck]) cache[ck] = Promise.all([works(), wardLookup()]).then(([list, wards]) => {
    const per = {};
    for (const k of Object.keys(wards[slug] || {})) {
      per[k] = { key: k, ward: wards[slug][k], works: 0, cost: 0, paid: 0, late: 0, noContractor: 0, noDate: 0, rank: {} };
    }
    let cityN = 0, cityNoC = 0, cityNoD = 0;
    for (const w of list) {
      if (w.city !== slug) continue;
      if (w.wards.length) { cityN++; cityNoC += !w.contractor; cityNoD += !w.deadline; }
      for (const k of w.wards) {
        const p = per[k];
        if (!p) continue;
        p.works++; p.cost += w.cost; p.paid += w.paid; p.late += !!w.flag;
        p.noContractor += !w.contractor; p.noDate += !w.deadline;
      }
    }
    const all = Object.values(per);
    for (const m of Object.keys(CARD_METRICS)) {
      all.slice().sort((a, b) => b[m] - a[m]).forEach((p, i, arr) => {
        // Equal values share a rank: "joint 4th".
        p.rank[m] = i && arr[i - 1][m] === p[m] ? arr[i - 1].rank[m] : i + 1;
      });
    }
    return { per, all, avgNoContractor: cityN ? cityNoC / cityN : 0, avgNoDate: cityN ? cityNoD / cityN : 0 };
  });
  return cache[ck];
}
const ordinal = n => n + ({ 1: "st", 2: "nd", 3: "rd" }[(n % 100 >= 11 && n % 100 <= 13) ? 0 : n % 10] || "th");
const pct = (a, b) => b ? Math.round(100 * a / b) + "%" : "—";

function reportCard(slug, c, p, cards, ww) {
  const n = cards.all.length;
  const rank = m => p[m] ? `<span class="muted small">${ordinal(p.rank[m])} of ${fmtN(n)} wards</span>` : "";
  const seen = new Set();  // the same work can be filed twice (tender and work order)
  const top = ww.filter(x => x.cost).sort((a, b) => b.cost - a.cost)
    .filter(x => !seen.has(x.title.toLowerCase()) && seen.add(x.title.toLowerCase())).slice(0, 3);
  const firms = {};
  ww.forEach(x => { if (x.contractor) firms[x.contractor] = (firms[x.contractor] || 0) + 1; });
  const topFirms = Object.entries(firms).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const base = `#/city/${slug}/ward/${enc(p.key)}`;
  const asks = [
    p.late ? `<b>${fmtN(p.late)}</b> works are past their finish date. Ask the ward or division office for revised dates. <a href="${base}?f=late">See them</a>` : "",
    p.noContractor ? `<b>${fmtN(p.noContractor)}</b> works have no contractor published. An RTI application gets the names: open a work and use "Ask about this work". <a href="${base}?f=unknown">See them</a>` : "",
    top[0] ? `The biggest work is <a href="#/work/${enc(top[0].id)}">${esc(top[0].title.slice(0, 80))}${top[0].title.length > 80 ? "…" : ""}</a> (${inr(top[0].cost)}). Is it visible on the ground, and on time?` : "",
  ].filter(Boolean);
  return `<section class="report" id="card">
    <div class="reporthead"><h2>Ward report card</h2>
      <span class="noprint"><button type="button" class="btn" id="card-print">Print</button> <button type="button" class="btn" id="card-share">Share</button></span></div>
    <p class="muted small">${esc(wardLabel(slug, p.ward))}. Compared with ${c.name}'s ${fmtN(n)} wards, using the road works Nagarika has found so far (${date(cards.built)}). Works filed under an older ward map count in every ward they overlap.</p>
    <table class="fields"><tbody>
      ${Object.entries(CARD_METRICS).map(([m, [label, f]]) => `<tr><th scope="row">${label}</th><td>${f(p[m])} ${rank(m)}</td></tr>`).join("")}
      <tr><th scope="row">Contractor not published<span class="help">Share of this ward's works whose contractor the source does not name.</span></th><td>${fmtN(p.noContractor)} of ${fmtN(p.works)} (${pct(p.noContractor, p.works)}) <span class="muted small">city: ${pct(cards.avgNoContractor, 1)}</span></td></tr>
      ${cards.avgNoDate < .99 ? `<tr><th scope="row">No finish date published</th><td>${fmtN(p.noDate)} of ${fmtN(p.works)} (${pct(p.noDate, p.works)}) <span class="muted small">city: ${pct(cards.avgNoDate, 1)}</span></td></tr>`
        : `<tr><th scope="row">Finish dates</th><td><span class="np">Not published for any work in ${esc(c.name)}</span></td></tr>`}
      <tr><th scope="row">Biggest works</th><td>${top.length ? `<ol class="tight">${top.map(x => `<li><a href="#/work/${enc(x.id)}">${esc(x.title.slice(0, 90))}${x.title.length > 90 ? "…" : ""}</a> <span class="muted small">${inr(x.cost)}</span></li>`).join("")}</ol>` : NP}</td></tr>
      <tr><th scope="row">Most frequent contractors</th><td>${topFirms.length ? topFirms.map(([f, k]) => `${esc(f)} <span class="muted small">(${k} works)</span>`).join("<br>") : NP}</td></tr>
      ${p.ward.assembly ? `<tr><th scope="row">Assembly constituency</th><td>${esc(p.ward.assembly)}</td></tr>` : ""}
    </tbody></table>
    ${asks.length ? `<h3>Questions to raise</h3><ul class="tight">${asks.map(a => `<li>${a}</li>`).join("")}</ul>` : ""}
    <p class="small noprint"><a href="#/city/${slug}/cards">Compare all wards in ${esc(c.name)}</a></p>
  </section>`;
}

function wireCard(title) {
  const pr = document.getElementById("card-print");
  if (!pr) return;
  pr.onclick = () => { document.body.classList.add("printcard"); window.print(); document.body.classList.remove("printcard"); };
  document.getElementById("card-share").onclick = async () => {
    const url = location.href.split("?")[0];
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); document.getElementById("card-share").textContent = "Link copied"; }
    } catch { /* cancelled */ }
  };
}

async function wardCompare(slug) {
  const [meta, cards] = await Promise.all([load("meta.json"), wardCards(slug)]);
  const c = meta.cities.find(x => x.slug === slug);
  if (!c) return notFound();
  const { q } = parseHash();
  const sortKey = { works: 1, cost: 1, paid: 1, late: 1, gap: 1 }[q.get("sort")] ? q.get("sort") : "works";
  const gap = p => p.works ? p.noContractor / p.works : -1;
  const rows = cards.all.filter(p => p.works).sort(sortKey === "gap" ? (a, b) => gap(b) - gap(a) : (a, b) => b[sortKey] - a[sortKey]);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works", "#/roads"], [c.name, `#/city/${slug}`], ["Compare wards"]])}
    <h1>Ward report cards: ${esc(c.name)}</h1>
    <p class="lede">Every ward's road works side by side. Tap a ward for its full report card and the works behind each number.</p>
    <div class="toolbar"><label class="select"><span>Sort</span><select id="cs">
      ${[["works", "Most works"], ["cost", "Highest sanctioned"], ["paid", "Most paid"], ["late", "Most past finish date"], ["gap", "Most contractors unpublished"]].map(([k, l]) =>
        `<option value="${k}"${k === sortKey ? " selected" : ""}>${l}</option>`).join("")}
    </select></label></div>
    <table class="plain stack"><thead><tr><th>Ward</th><th class="num">Works</th><th class="num">Sanctioned</th><th class="num">Paid</th><th class="num">Past finish</th><th class="num">No contractor</th></tr></thead>
    <tbody>${rows.map(p => `<tr><td><a href="#/city/${slug}/ward/${enc(p.key)}">${esc(wardLabel(slug, p.ward))}</a></td>
      <td class="num" data-label="Works">${fmtN(p.works)}</td><td class="num" data-label="Sanctioned">${inr(p.cost) || "—"}</td>
      <td class="num" data-label="Paid">${inr(p.paid) || "—"}</td><td class="num" data-label="Past finish">${fmtN(p.late)}</td>
      <td class="num" data-label="No contractor">${pct(p.noContractor, p.works)}</td></tr>`).join("")}</tbody></table>
    <p class="muted small">${fmtN(cards.all.length - rows.length)} wards have no road works found yet. Works with no ward named in the source are not counted.</p>`;
  document.getElementById("cs").onchange = e => setQuery({ sort: e.target.value === "works" ? "" : e.target.value });
}

async function ward(slug, key) {
  const [meta, list, wards, geo, mp] = await Promise.all([load("meta.json"), works(), wardLookup(), load(`wards/${slug}.geojson`),
    load("mplads_index.json").catch(() => [])]);
  const c = meta.cities.find(x => x.slug === slug);
  if (!c) return notFound();
  const none = key === "_none";
  const w = wards[slug][key];
  if (!none && !w) return notFound();
  const ww = list.filter(x => x.city === slug && (none ? !x.wards.length : x.wards.includes(key)));
  const sum = f => ww.reduce((a, x) => a + x[f], 0);
  const cards = none ? null : await wardCards(slug);
  if (cards) cards.built = meta.last_checked;
  // The ward's MP, and MP fund works whose description names the ward.
  let mpHtml = "";
  if (w && w.pc) {
    const [pcId, pcName] = w.pc.split(":");
    const st = mp.find(s => s.constituencies.some(k => k.id === pcId));
    if (st) {
      const con = st.constituencies.find(k => k.id === pcId);
      const wn = normalise(w.name);
      const named = (await mpWorks(st.slug)).filter(x => x.constituency_id === pcId && normalise(x.description).includes(wn));
      mpHtml = `<h2>MP funds</h2>
        <p>This ward is in <b>${esc(pcName)}</b> Lok Sabha constituency (MP: ${esc(person(con.mp))}).
        <a href="#/mp/${st.slug}/${pcId}">See all ${fmtN(con.works)} MPLADS works</a>${named.length ? `. ${named.length} mention ${esc(w.name)}:` : "."}</p>
        ${named.length ? `<ul class="links">${named.slice(0, 8).map(x => `<li><a href="#/mpwork/${st.slug}/${enc(x.id)}">${esc(x.description)}</a> <span class="muted small">${inr(x.amount)} · ${esc(x.stage || "")}</span></li>`).join("")}</ul>` : ""}`;
    }
  }
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works", "#/roads"], [c.name, `#/city/${slug}`], [none ? "No ward named" : w.name]])}
    <h1>${esc(none ? `${c.name}: works with no ward named` : wardLabel(slug, w))}</h1>
    ${w && w.assembly ? `<p class="muted">Assembly constituency: ${esc(w.assembly)}</p>` : ""}
    ${stats([[fmtN(ww.length), "Road works"], [fmtN(ww.filter(x => x.flag).length), "Past finish date"],
      [inr(sum("cost")) || "—", "Sanctioned, where published"], [inr(sum("paid")) || "—", "Paid, where published"]])}
    ${none ? "" : '<div id="wardmap" class="map short"></div>'}
    ${cards && ww.length ? reportCard(slug, c, cards.per[key], cards, ww) : ""}
    ${ww.some(x => x.ward_match.startsWith("crosswalk")) ? `<p class="note">Some works were filed under an older ward map. They are listed in every current ward that overlaps the old ward, so they can also appear in a neighbouring ward.</p>` : ""}
    <h2>Road works</h2>
    <div id="res"></div>
    ${mpHtml}
    ${complainBox([slug, "national"], c.name)}`;
  results(document.getElementById("res"), ww, roadView());
  wireCard(`${w ? w.name : c.name}: ward report card`);
  if (!none) {
    const m = newMap("wardmap");
    if (!m) return;
    const f = geo.features.find(f => f.properties.ward_key === key);
    m.fitBounds(L.geoJSON(f, { style: { weight: 2, fillOpacity: .12 } }).addTo(m).getBounds());
  }
}

async function state(name) {
  const list = (await works()).filter(w => (w.state || "Unknown") === name);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works", "#/roads"], [name]])}
    <h1>Road works in ${esc(name)}</h1>
    ${stats([[fmtN(list.length), "Works"], [fmtN(list.filter(w => w.flag).length), "Past finish date"],
      [fmtN(new Set(list.map(w => w.place).filter(Boolean)).size), "Towns and districts"]])}
    <div id="res"></div>`;
  results(document.getElementById("res"), list, roadView(w => esc(w.place || "Place not given")));
}

async function work(id) {
  const [meta, list, wards] = await Promise.all([load("meta.json"), works(), wardLookup()]);
  const w = list.find(x => x.id === id);
  if (!w) return notFound();
  const cityName = (meta.cities.find(c => c.slug === w.city) || {}).name;
  const wardLinks = w.wards.map(k => w.city && wards[w.city] && wards[w.city][k]
    ? `<a href="#/city/${w.city}/ward/${enc(k)}">${esc(wardLabel(w.city, wards[w.city][k]))}</a>` : esc(k)).join("<br>");
  const how = w.ward_match === "text" ? "Named in the work's title or location."
    : w.ward_match.startsWith("crosswalk") ? `Filed under ${esc(w.ward_match.replace("crosswalk from ", "the ").replace(" (approximate)", ""))}. Shown in each current ward overlapping it (approximate).`
    : "The source does not name a ward we could recognise.";
  const row = fieldRow;
  const missing = [[!w.contractor, "the contractor"], [!w.sanctioned_cost, "the cost"], [!w.start_date, "the start date"],
    [w.deadline_basis !== "official", "an official finish date"], [!w.amount_paid, "the amount paid"]].filter(x => x[0]).map(x => x[1]);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works", "#/roads"], w.city ? [cityName, `#/city/${w.city}`] : [w.state, `#/state/${enc(w.state)}`], ["Work"]])}
    <h1 class="title">${esc(w.title)}</h1>
    <p>${badge(w)} <a class="jump" href="#" onclick="document.getElementById('ask').scrollIntoView();return false">Ask about this work ↓</a></p>
    ${w.flag === "overdue" ? `<p class="note warn">The official finish date has passed and the source does not show the work as complete.</p>` : ""}
    ${w.flag === "past_estimate" ? `<p class="note warn">The source gives no finish date. Our estimate (bid opening + period of work) has passed. The work may have started later, so treat this as a question to ask, not a finding.</p>` : ""}
    <table class="fields"><tbody>
      ${row("Agency", esc(w.agency))}
      ${row("Office", esc(w.office))}
      ${row("Contractor", esc(w.contractor))}
      ${row("Sanctioned cost", w.sanctioned_cost ? `${inr(w.sanctioned_cost)} <span class="muted small">${esc(w.cost_basis)}</span>` : "")}
      ${row("Amount paid", inr(w.amount_paid))}
      ${row("Tender published", date(w.published_date))}
      ${row("Start or award date", date(w.start_date))}
      ${row("Period of work", w.period_days ? `${w.period_days} days` : "")}
      ${row("Finish by", w.deadline ? `${finishBy(w)}${w.deadline_basis !== "official" ? `<div class="muted small">${esc(w.deadline_basis)}</div>` : ""}` : "")}
      ${row("Status", esc(w.status).replace(/\d{4}-\d{2}-\d{2}/, date))}
      ${row("Ward", wardLinks ? `${wardLinks}<div class="muted small">${how}</div>` : `<span class="np">${how}</span>`)}
      ${row("Location in source", esc(w.location_text))}
      ${row("Place", esc([w.place, w.pincode, w.state].filter(Boolean).join(", ")))}
    </tbody></table>
    <h2>Official source</h2>
    <p><a class="btn" href="${esc(w.source_url)}" target="_blank" rel="noopener">Open source record</a></p>
    <p class="muted small">${esc(w.source_note)} Record ${esc(w.source_id)}. First seen ${date(w.first_seen)}, last checked ${date(w.last_checked)}.</p>
    ${complainBox([w.city, "roads", "national"].filter(Boolean), cityName || "")}
    ${askPanel(missing.length ? `The source does not publish ${missing.join(", ")}. An RTI application makes the agency give it to you.` : "Want the full file, or the work is stuck? Send an RTI application or a complaint.")}
    <p class="small"><a href="${REPO}/issues/new?title=${enc("Data: " + w.id)}">Report a mistake</a></p>`;
  wireAsk([["rti", "RTI application", me => roadRti(w, me)], ["complaint", "Complaint letter", me => roadComplaint(w, me)]], w.source_id);
}

async function overdue() {
  const [meta, list] = await Promise.all([load("meta.json"), works()]);
  const { q } = parseHash();
  const late = list.filter(w => w.flag);
  const scopes = [["", "All India"], ...meta.cities.map(c => ["c:" + c.slug, c.name]),
    ...Object.keys(meta.states).sort().filter(s => late.some(w => w.state === s)).map(s => ["s:" + s, s])];
  const scope = q.get("in") || "";
  const shown = late.filter(w => !scope || (scope.startsWith("c:") ? w.city === scope.slice(2) : w.state === scope.slice(2)));
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works", "#/roads"], ["Past finish date"]])}
    <h1>Road works past their finish date</h1>
    <p class="muted"><b>Overdue</b> means an official finish date has passed. <b>Past estimated finish</b> means the source gives only a period of work, so the date is our estimate. Sources rarely publish completion, so some of these may be done.</p>
    ${stats([[fmtN(late.filter(w => w.flag === "overdue").length), "Overdue (official date)"], [fmtN(late.filter(w => w.flag === "past_estimate").length), "Past estimated finish"]])}
    <div class="toolbar"><label class="select"><span>Where</span><select id="in">${scopes.map(([k, l]) =>
      `<option value="${esc(k)}"${k === scope ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label></div>
    <div id="res"></div>`;
  document.getElementById("in").onchange = e => setQuery({ in: e.target.value, page: "" });
  results(document.getElementById("res"), shown, { ...roadView(w => esc([w.place, w.state].filter(Boolean).join(", "))), sort: "finish" });
}

// ---------- pages: MP funds ----------
async function mpHome() {
  const idx = await load("mplads_index.json").catch(() => []);
  const tot = f => idx.reduce((a, s) => a + s[f], 0);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MP funds"]])}
    <h1>MP funds (MPLADS)</h1>
    <p class="lede">Each Member of Parliament can recommend ₹5 crore of works a year in their constituency: classrooms, roads, borewells, ambulances. See what each MP recommended, what was sanctioned and what got finished.</p>
    ${idx.length ? stats([[fmtN(tot("works")), "Works recommended"], [inr(tot("sanctioned")) || "—", "Sanctioned"],
      [fmtN(tot("completed")), "Completed"], [esc(idx[0].tenure), "Lok Sabha"]]) : '<p class="note">MPLADS data is being collected. Check back after the next update.</p>'}
    <div class="toolbar"><input class="input" id="cq" type="search" placeholder="Find your constituency or MP (typos are fine)" aria-label="Find a constituency or MP"></div>
    <div id="cons"></div>
    <h2>By state</h2>
    <table class="plain stack"><thead><tr><th>State</th><th class="num">Works</th><th class="num">Sanctioned</th><th class="num">Completed</th></tr></thead>
    <tbody>${idx.map(s => `<tr><td><a href="#/mp/${s.slug}">${esc(s.state)}</a></td><td class="num" data-label="Works">${fmtN(s.works)}</td><td class="num" data-label="Sanctioned">${inr(s.sanctioned) || "—"}</td><td class="num" data-label="Completed">${fmtN(s.completed)}</td></tr>`).join("")}</tbody></table>
    <p class="muted small">Source: <a href="https://mplads.mospi.gov.in/digigov/dashboard.html">eSAKSHI MPLADS dashboard</a>, Ministry of Statistics and Programme Implementation. New to MPLADS? Read <a href="#/guides/mplads">the guide</a>.</p>`;
  const all = idx.flatMap(s => s.constituencies.map(c => ({ ...c, state: s.state, slug: s.slug })));
  document.getElementById("cq").oninput = e => {
    const hits = e.target.value.trim().length > 1 ? fuzzy(all, e.target.value, ["name", "mp", "state"], 1).slice(0, 10) : [];
    document.getElementById("cons").innerHTML = hits.length ? `<ul class="placehits">${hits.map(c =>
      `<li><a href="#/mp/${c.slug}/${c.id}"><b>${esc(c.name)}</b></a> <span class="muted small">${esc(c.state)} · MP: ${esc(person(c.mp))}</span></li>`).join("")}</ul>` : "";
  };
}

async function mpState(slug) {
  const idx = await load("mplads_index.json");
  const s = idx.find(x => x.slug === slug);
  if (!s) return notFound();
  const list = await mpWorks(slug);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MP funds", "#/mp"], [s.state]])}
    <h1>MP funds in ${esc(s.state)}</h1>
    ${stats([[fmtN(s.works), "Works recommended"], [inr(s.sanctioned) || "—", "Sanctioned"], [fmtN(s.completed), "Completed"], [esc(s.tenure), "Lok Sabha"]])}
    <h2>Constituencies</h2>
    <div class="toolbar"><input class="input" id="cq" type="search" placeholder="Find a constituency or MP" aria-label="Find a constituency or MP"></div>
    <table class="plain stack" id="ct"><thead><tr><th>Constituency</th><th>MP</th><th class="num">Works</th><th class="num">Sanctioned</th><th class="num">Completed</th></tr></thead><tbody></tbody></table>
    <h2>All works in ${esc(s.state)}</h2>
    <div id="res"></div>`;
  const drawCons = t => {
    const shown = t ? fuzzy(s.constituencies, t, ["name", "mp"], 1) : s.constituencies;
    document.querySelector("#ct tbody").innerHTML = shown.map(c => `<tr><td><a href="#/mp/${slug}/${c.id}">${esc(c.name)}</a></td>
      <td class="sub-cell" data-label="MP">${esc(person(c.mp))}</td><td class="num" data-label="Works">${fmtN(c.works)}</td>
      <td class="num" data-label="Sanctioned">${inr(c.sanctioned) || "—"}</td><td class="num" data-label="Completed">${fmtN(c.completed)}</td></tr>`).join("");
  };
  drawCons("");
  document.getElementById("cq").oninput = e => drawCons(e.target.value);
  results(document.getElementById("res"), list, mpView(slug, true));
}

async function mpConstituency(slug, id) {
  const idx = await load("mplads_index.json");
  const s = idx.find(x => x.slug === slug);
  const c = s && s.constituencies.find(x => x.id === id);
  if (!c) return notFound();
  const list = (await mpWorks(slug)).filter(w => w.constituency_id === id);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MP funds", "#/mp"], [s.state, `#/mp/${slug}`], [c.name]])}
    <h1>${esc(c.name)}</h1>
    <p class="muted">MP: <b>${esc(person(c.mp))}</b> · ${esc(s.tenure)}</p>
    ${stats([[fmtN(c.works), "Works recommended"], [inr(c.sanctioned) || "—", "Sanctioned"], [fmtN(c.completed), "Completed"],
      [`<a href="#/mp/${slug}/${id}?f=late">${fmtN(list.filter(overYear).length)}</a>`, "Over a year since sanction"]])}
    <p class="small"><a href="#/guides/mplads">How MPLADS works, and how to check this on the official portal</a></p>
    <div id="res"></div>
    <p class="muted small">MPs may also recommend some works outside their constituency, so a few works here are in other districts.</p>
    ${complainBox(["mp", "national"], "")}`;
  results(document.getElementById("res"), list, mpView(slug, false));
}

async function mpWork(slug, id) {
  const w = (await mpWorks(slug)).find(x => x.id === id);
  if (!w) return notFound();
  const idx = await load("mplads_index.json");
  const s = idx.find(x => x.slug === slug);
  const row = fieldRow;
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MP funds", "#/mp"], [s.state, `#/mp/${slug}`], [w.constituency, `#/mp/${slug}/${w.constituency_id}`], ["Work"]])}
    <h1 class="title">${esc(w.description || w.activity)}</h1>
    <p><a class="jump" href="#" onclick="document.getElementById('ask').scrollIntoView();return false">Ask about this work ↓</a></p>
    ${overYear(w) ? `<p>${yearBadge(w)}</p><p class="note warn">Sanctioned on ${date(w.sanction_date)} and not marked complete. MPLADS rules say sanctioned works are generally to be completed within one year. The work may be finished but not yet marked complete on the portal, so treat this as a question for the district authority.</p>` : ""}
    <table class="fields"><tbody>
      ${row("MP", esc(person(w.mp_name)))}
      ${row("Constituency", `<a href="#/mp/${slug}/${w.constituency_id}">${esc(w.constituency)}</a>`)}
      ${row("Type of work", esc(w.activity))}
      ${row("Category", esc(w.category))}
      ${row("District authority", esc(titleCase(w.implementing_agency)))}
      ${row("Recommended", [date(w.recommended_date), inr(w.recommended_amount)].filter(Boolean).join(" · "))}
      ${row("Sanctioned", [date(w.sanction_date), inr(w.sanction_amount)].filter(Boolean).join(" · "))}
      ${row("Stage", `${esc(w.stage) || NP} <a class="small" href="#/guides/mplads?s=stages">What does this mean?</a>`)}
      ${row("Completed", [date(w.completed_date), w.actual_amount ? `${inr(w.actual_amount)} spent` : ""].filter(Boolean).join(" · "))}
      ${row("Recommendation letter", esc(w.letter_no))}
    </tbody></table>
    <h2>Official source</h2>
    <p><a class="btn" href="https://mplads.mospi.gov.in/digigov/dashboard.html" target="_blank" rel="noopener">Open eSAKSHI dashboard</a></p>
    <p class="muted small">On the dashboard choose ${esc(s.state)} › ${esc(w.constituency)}, open "Works Recommended" and search letter ${esc(w.letter_no)}. Last checked ${date(w.last_checked)}.</p>
    ${complainBox(["mp", "national"], "")}
    ${askPanel(overYear(w) ? "This work is over a year past sanction and not marked complete. Ask the district authority why."
      : STAGE_PENDING(w.stage) ? "This work is still waiting for sanction. Ask the district authority where it stands."
      : "Want the sanction order, the contractor's name or the completion certificate? Ask the district authority.")}
    <p class="small"><a href="${REPO}/issues/new?title=${enc("Data: " + w.id)}">Report a mistake</a></p>`;
  const ws = { ...w, state: s.state };
  wireAsk([["rti", "RTI application", me => mpRti(ws, me)], ["complaint", "Letter to the Collector", me => mpComplaint(ws, me)]], w.letter_no || w.id);
}

// ---------- MLA funds ----------
async function mlaHome() {
  const idx = await load("mlalads_index.json").catch(() => []);
  if (idx.length === 1) return mlaState(idx[0].slug);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MLA funds"]])}
    <h1>MLA funds</h1>
    <p class="lede">Most states give each MLA a yearly fund to recommend works in their constituency. ${MLA_STATES_NOTE}</p>
    <table class="plain stack"><thead><tr><th>State</th><th class="num">Works</th><th class="num">Sanctioned</th><th class="num">Completed</th></tr></thead>
    <tbody>${idx.map(s => `<tr><td><a href="#/mla/${s.slug}">${esc(s.state)}</a></td><td class="num" data-label="Works">${fmtN(s.works)}</td><td class="num" data-label="Sanctioned">${inr(s.sanctioned) || "—"}</td><td class="num" data-label="Completed">${fmtN(s.completed)}</td></tr>`).join("")}</tbody></table>`;
}

function mlaStats(x) {
  return stats([[fmtN(x.works), "Works"], [inr(x.sanctioned) || "—", "Sanctioned"], [inr(x.spent) || "₹0", "Spent so far"],
    [fmtN(x.completed), "Completed"]]);
}

async function mlaState(slug) {
  const idx = await load("mlalads_index.json");
  const s = idx.find(x => x.slug === slug);
  if (!s) return notFound();
  const list = await mlaWorks(slug);
  const top = s.categories.slice(0, 5);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MLA funds", "#/mla"], [s.state]])}
    <h1>MLA funds in ${esc(s.state)}</h1>
    <p class="lede">Each of ${esc(s.state)}'s MLAs recommends works from the MLA Local Area Development Scheme (MLALADS). In Odisha that is ₹2 crore per constituency a year: ₹1 crore for general works, ₹50 lakh for roads and ₹50 lakh for education. These are the works sanctioned for ${s.years.map(esc).join(" and ")}.</p>
    ${mlaStats(s)}
    <p class="note">${fmtN(s.not_started)} of ${fmtN(s.works)} works (${Math.round(100 * s.not_started / s.works)}%) are marked <b>not started</b>.</p>
    <h2>What the money is for</h2>
    <table class="plain"><tbody>${top.map(([c, n]) => `<tr><td>${esc(c)}</td><td class="num">${fmtN(n)} works (${Math.round(100 * n / s.works)}%)</td></tr>`).join("")}</tbody></table>
    <h2>Constituencies</h2>
    <div class="toolbar"><input class="input" id="cq" type="search" placeholder="Find your constituency or district" aria-label="Find a constituency or district"></div>
    <table class="plain stack" id="ct"><thead><tr><th>Constituency</th><th>District</th><th class="num">Works</th><th class="num">Sanctioned</th><th class="num">Spent</th><th class="num">Completed</th></tr></thead><tbody></tbody></table>
    <h2>All works in ${esc(s.state)}</h2>
    <div id="res"></div>
    <p class="muted small">Source: <a href="https://mlalads.odisha.gov.in/IPMS/Report" target="_blank" rel="noopener">MLALADS portal</a>, Planning &amp; Convergence Department, Government of Odisha. Last checked ${date(s.last_checked)}. The portal answers only visitors in India, so this is collected from a computer in India. It does not list the MLA's name with each work, or the sanction date. ${MLA_STATES_NOTE}</p>`;
  const drawCons = t => {
    const shown = t ? fuzzy(s.constituencies, t, ["name", "district"], 1) : s.constituencies;
    document.querySelector("#ct tbody").innerHTML = shown.map(c => `<tr><td><a href="#/mla/${slug}/${c.id}">${esc(c.name)}</a></td>
      <td class="sub-cell" data-label="District">${esc(c.district)}</td><td class="num" data-label="Works">${fmtN(c.works)}</td>
      <td class="num" data-label="Sanctioned">${inr(c.sanctioned) || "—"}</td><td class="num" data-label="Spent">${inr(c.spent) || "₹0"}</td>
      <td class="num" data-label="Completed">${fmtN(c.completed)}</td></tr>`).join("");
  };
  drawCons("");
  document.getElementById("cq").oninput = e => drawCons(e.target.value);
  results(document.getElementById("res"), list, mlaView(slug, true));
}

async function mlaConstituency(slug, id) {
  const idx = await load("mlalads_index.json");
  const s = idx.find(x => x.slug === slug);
  const c = s && s.constituencies.find(x => x.id === id);
  if (!c) return notFound();
  const list = (await mlaWorks(slug)).filter(w => w.cons === id);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MLA funds", "#/mla"], [s.state, `#/mla/${slug}`], [c.name]])}
    <h1>${esc(c.name)}</h1>
    <p class="muted">Assembly constituency · ${esc(c.district)} district, ${esc(s.state)} · ${s.years.map(esc).join(", ")}</p>
    ${c.mla ? `<p>MLA: <b>${esc(c.mla)}</b></p>` : ""}
    ${mlaStats(c)}
    ${c.not_started ? `<p class="note"><a href="#/mla/${slug}/${id}?f=notstarted">${fmtN(c.not_started)} works</a> are marked not started.</p>` : ""}
    ${c.awaiting ? `<p class="note"><a href="#/mla/${slug}/${id}?f=awaiting">${fmtN(c.awaiting)} works</a> recommended by the MLA are still waiting for approval or sanction.</p>` : ""}
    <div id="res"></div>
    ${complainBox(["mla_" + slug, "national"], "")}`;
  results(document.getElementById("res"), list, mlaView(slug, false));
}

function mlaRef(w) {
  return [
    `Work: ${w.name}`,
    `Project code: ${w.project_code} (MLALADS, ${w.financial_year})`,
    `Constituency: ${w.constituency}, ${w.district} district`,
    w.mla ? `Recommended by: ${w.mla}${w.letter_no ? `, letter ${w.letter_no}` : ""}${w.recommended_on ? ` (${date(w.recommended_on)})` : ""}` : "",
    w.sanction_amount ? `Amount sanctioned: ${inr(w.sanction_amount)}` : "",
    `Spent so far, as shown on the MLALADS portal: ${inr(w.spent_amount) || "Rs 0"}`,
    w.status ? `Status on the portal: ${w.status}` : "",
  ].filter(Boolean).join("\n");
}

function mlaRti(w, me) {
  const to = ["The Public Information Officer", "Office of the Block Development Officer / Office of the District Collector (MLALADS)", `${w.district} district, Odisha`].join("\n");
  return rtiLetter(to, "Application for information under section 6(1) of the Right to Information Act, 2005 (MLALADS work)",
    `I request the following information about this work under the MLA Local Area Development Scheme:\n\n${mlaRef(w)}`, [
      "A copy of the MLA's recommendation letter for this work, with its date.",
      "A certified copy of the administrative approval and sanction order, with the approved estimate.",
      "The name of the executing agency and of the contractor, committee or vendor doing the work, with a copy of the work order.",
      "The amounts released and spent so far, with dates, and copies of the utilisation certificates.",
      MLA_DONE(w.status) ? "A copy of the completion certificate, and photographs of the completed work."
        : `The present status of the work and the date by which it will be completed.${w.days_allowed ? ` The portal gives ${w.days_allowed} days for this work; please give the records showing the reasons for any delay.` : ""}`,
      "Under section 2(j) of the Act, I also wish to inspect the file for this work. Please tell me a date and time.",
    ], me);
}

async function mlaWork(slug, id) {
  const w = (await mlaWorks(slug)).find(x => x.id === id);
  if (!w) return notFound();
  const idx = await load("mlalads_index.json");
  const s = idx.find(x => x.slug === slug);
  const row = fieldRow;
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MLA funds", "#/mla"], [s.state, `#/mla/${slug}`], [w.constituency, `#/mla/${slug}/${w.cons}`], ["Work"]])}
    <h1 class="title">${esc(w.name)}</h1>
    <p><a class="jump" href="#" onclick="document.getElementById('ask').scrollIntoView();return false">Ask about this work ↓</a></p>
    <table class="fields"><tbody>
      ${row("Assembly constituency", `<a href="#/mla/${slug}/${w.cons}">${esc(w.constituency)}</a>, ${esc(w.district)} district`)}
      ${row("Project code", esc(w.project_code))}
      ${row("Year", esc(w.financial_year))}
      ${row("Kind of work", [esc(w.category), w.component ? `${esc(w.component)} share of the fund` : ""].filter(Boolean).join(" · "))}
      ${row("Carried out by", esc(w.department))}
      ${row("Amount sanctioned", inr(w.sanction_amount))}
      ${row("Spent so far", inr(w.spent_amount) || "₹0")}
      ${row("Time allowed", w.days_allowed ? `${fmtN(w.days_allowed)} days` : "")}
      ${row("Status", esc(w.status))}
      ${row("MLA", esc(w.mla))}
      ${row("Recommended", [date(w.recommended_on), w.letter_no ? `letter ${esc(w.letter_no)}` : "", inr(w.recommended_amount)].filter(Boolean).join(" · "))}
      ${row("Sanctioned on", date(w.sanctioned_on))}
      ${row("Implementing agency", esc(w.agency))}
      ${row("Where", [w.village, w.block].filter(Boolean).map(esc).join(", "))}
    </tbody></table>
    <h2>Official source</h2>
    <p><a class="btn" href="https://mlalads.odisha.gov.in/IPMS/Report" target="_blank" rel="noopener">Open the MLALADS report</a></p>
    <p class="muted small">The portal opens only from India. On it, choose ${esc(w.district)} › ${esc(w.constituency)} and look for project ${esc(w.project_code)}. Last checked ${date(w.last_checked)}.</p>
    ${complainBox(["mla_" + slug, "national"], "")}
    ${askPanel(MLA_AWAITING(w.status) ? `This work was recommended${w.recommended_on ? ` on ${date(w.recommended_on)}` : ""} and is ${esc(w.status.toLowerCase())}. Ask the district office when it will be sanctioned.`
      : MLA_NOT_STARTED(w.status) ? "This work is sanctioned but marked not started. Ask the block or district office why."
      : "Want the sanction order, the contractor's name or the completion certificate? Ask the block or district office.")}
    <p class="small"><a href="${REPO}/issues/new?title=${enc("Data: " + w.id)}">Report a mistake</a></p>`;
  wireAsk([["rti", "RTI application", me => mlaRti(w, me)]], w.project_code);
}

// ---------- about ----------
const SOURCE_INFO = {
  "kppp": ["Karnataka Public Procurement Portal", "https://kppp.karnataka.gov.in", "All Karnataka works tenders, including Bengaluru's five city corporations. Estimated cost, status and, once awarded, the contractor. No finish date."],
  "bbmp-workorders": ["BBMP work orders and payments (via OpenCity)", "https://data.opencity.in/dataset/bbmp-work-orders-and-payments-2025-26", "From BBMP's accounts portal, republished by OpenCity. Contractor and amounts paid, filed by old ward number."],
};

async function about() {
  const meta = await load("meta.json");
  const src = Object.entries(meta.sources).sort((a, b) => b[1] - a[1]);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["About & data"]])}
    <h1>About Nagarika</h1>
    <p class="lede">Public money builds our roads, drains and schools. The records exist, but they are scattered across portals, PDFs and spreadsheets. Nagarika puts them in one place, by topic and by place, in plain language.</p>
    <h2>What we do</h2>
    <ol class="steps">
      <li><b>Make data easy to use.</b> Search by street, ward, MP or PIN code; see who is doing a work, what it costs and when it should finish; follow the link to the official record.</li>
      <li><b>Help people collect more of it.</b> Our collectors are open source, and every gap ("Not published") is a pointer to what to ask for, by RTI or from the ward office.</li>
      <li><b>Be the missing middle.</b> Where no one structures a source yet, we fetch it, clean it and publish it as open data for anyone to build on.</li>
    </ol>
    <h2>How the site is organised</h2>
    <p><b>Topics</b> (road works, MP funds, and more to come) sit at the top. Inside each topic you go down by <b>place</b>: state, then city or constituency, then ward. Search and "Use my location" jump straight to a place.</p>
    <h2>Working with others</h2>
    <p><a href="https://opencity.in">OpenCity</a> collects and publishes civic datasets, including the BBMP work orders and the ward maps used here. Nagarika builds on that: we join datasets, keep them updated and present them by place. Our structured data is open for OpenCity and anyone else to reuse, and we credit every upstream source.</p>
    <h2>How to use it</h2>
    <ul class="uses">
      <li><b>A road outside your home is dug up.</b> Tap "Use my location" or search your street. Find the agency, contractor and cost, and quote the work or tender number when you call the ward office.</li>
      <li><b>Before a ward committee or RWA meeting.</b> Open your ward page and sort by cost. Ask about the biggest works and those past their finish date.</li>
      <li><b>Ask your MP.</b> Open your constituency under MP funds. See which works were recommended, which still await sanction, and which were finished.</li>
      <li><b>Filing an RTI.</b> Fields marked "Not published" are exactly what to ask for. Cite the work order, tender or letter number from the record.</li>
      <li><b>Reporting a story.</b> Filter by contractor to see where one firm is working, then check each entry against its official record.</li>
      <li><b>Spotting repeat work.</b> Search a street name to see whether the same stretch was paid for more than once.</li>
    </ul>
    <h2>Sources</h2>
    <table class="plain"><thead><tr><th>Source</th><th class="num">Works</th><th>What it gives</th></tr></thead><tbody>${src.map(([s, n]) => {
      const [name, url, what] = SOURCE_INFO[s] || (s.startsWith("gepnic-")
        ? [`E-procurement portal (NIC): ${s.slice(7).toUpperCase()}`, "", "Active tenders of municipal, public works and highway bodies. Tender value and period of work. Contractors sit behind a captcha and are not collected yet."]
        : [s, "", ""]);
      return `<tr><td>${url ? `<a href="${url}">${esc(name)}</a>` : esc(name)}</td><td class="num">${fmtN(n)}</td><td>${esc(what)}</td></tr>`;
    }).join("")}
      <tr><td><a href="https://mplads.mospi.gov.in/digigov/dashboard.html">eSAKSHI MPLADS dashboard (MoSPI)</a></td><td class="num">—</td><td>Works recommended, sanctioned and completed under MPLADS for the current Lok Sabha, per constituency.</td></tr>
    </tbody></table>
    <p class="muted small">Ward maps: ${meta.cities.map(c => `<a href="${esc(c.ward_map_source)}">${esc(c.name)}</a>`).join(", ")} (OpenCity). Map tiles © OpenStreetMap contributors.</p>
    <h2>Method and limits</h2>
    <ul>
      <li>Road works: only road-related works for now (roads, footpaths, drains, culverts, flyovers, and pipe or cable work that digs up a road).</li>
      <li>Wards come from the work's own text ("Ward No. 114", "K/E ward", a ward name). Older BBMP work orders use old ward numbers and are mapped to every current ward that overlaps.</li>
      <li>"Overdue" needs an official finish date. Estimated dates are always labelled.</li>
      <li>"Not published" means the source does not give it. Nothing is guessed.</li>
      <li>Road works update every 6 hours, MP funds daily. Last update ${date(meta.last_checked)}.</li>
    </ul>
    <h2>Download</h2>
    <p><a class="btn" href="data/works.csv">Road works (CSV)</a> <a class="btn" href="data/mplads.csv">MP fund works (CSV)</a></p>
    <p class="muted small"><a href="data/LICENSE.md">ODbL 1.0</a>: credit "Nagarika contributors" and share improvements alike.</p>
    <h2>Contribute</h2>
    <p>Code is MIT-licensed on <a href="${REPO}">GitHub</a>. Adding a city or a state portal is usually a few lines; see <a href="${REPO}/blob/main/CONTRIBUTING.md">the contributing guide</a>. Found a mistake? <a href="${REPO}/issues">Open an issue</a>.</p>`;
}

// ---------- guides: how to use the official sources yourself ----------
const GUIDES = [
  { key: "education", title: "Help for children's education", ready: true,
    blurb: "Free schooling, scholarships, meals, residential schools and NGOs, with where and how to apply." },
  { key: "mplads", title: "MP funds (MPLADS) on the official eSAKSHI portal", ready: true,
    blurb: "How the scheme works, what each stage means, and how to look up your MP's works, download them and suggest a work." },
  { key: "kppp", title: "Karnataka tenders (KPPP)", blurb: "Finding a tender, its value and the awarded contractor." },
  { key: "gepnic", title: "State and central tender portals (eProcure)", blurb: "Searching tenders by organisation and Tender ID." },
  { key: "rti", title: "Filing an RTI for missing details", ready: true, blurb: "What to ask, whom to send it to, the fee, the deadlines, and what to do if there is no reply." },
];

async function guides() {
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Guides"]])}
    <h1>Guides</h1>
    <p class="lede">Nagarika shows the data, but it all comes from official portals that anyone can use. These guides show you how, step by step, so you can check the source yourself.</p>
    <div class="cards topics">${GUIDES.map(g => g.ready
      ? `<a class="card live" href="#/guides/${g.key}"><h3>${esc(g.title)}</h3><p>${esc(g.blurb)}</p></a>`
      : `<div class="card soon"><h3>${esc(g.title)}</h3><span class="tag">Coming soon</span></div>`).join("")}</div>`;
}

async function guideMplads() {
  const img = (f, alt) => `<figure class="shot"><img src="guides/mplads/${f}" alt="${esc(alt)}" loading="lazy" onerror="this.parentNode.remove()"><figcaption>${esc(alt)}</figcaption></figure>`;
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Guides", "#/guides"], ["MPLADS"]])}
    <article class="guide">
    <h1>MP funds (MPLADS): how it works and how to check it yourself</h1>
    <p class="lede">Every Member of Parliament gets ₹5 crore a year to spend on works in their constituency through the Members of Parliament Local Area Development Scheme (MPLADS). Since April 2023 every step is recorded on the government's eSAKSHI portal, which anyone can read without logging in.</p>

    <h2>Who does what</h2>
    <ol class="flow">
      <li><b>The MP recommends a work.</b> They send a recommendation letter on the portal, saying what should be built and how much it should cost.</li>
      <li><b>The district authority sanctions it.</b> The District Collector or Deputy Commissioner's office (the "Implementing District Authority") checks the work is allowed and feasible, sanctions it and names an implementing agency.</li>
      <li><b>The implementing agency builds it.</b> Usually a government department or local body. It hires a vendor and asks for payments on the portal as the work progresses.</li>
      <li><b>The work is marked complete.</b> After the final payment, the implementing agency marks the work complete on the portal. Only then does it show as completed.</li>
    </ol>
    <p class="note">The rules say sanctioned works are generally to be completed within one year of sanction. Nagarika flags works that are past that as "Over a year since sanction".</p>

    <h2 id="stages">What each stage means</h2>
    <table class="fields"><tbody>
      <tr><th scope="row">Pending for Sanction</th><td>The MP has recommended the work; the district authority has not approved it yet.</td></tr>
      <tr><th scope="row">Sanction</th><td>The district authority has approved the work and the amount, and named an implementing agency.</td></tr>
      <tr><th scope="row">Time Estimation</th><td>The implementing agency is working out how long the work will take.*</td></tr>
      <tr><th scope="row">Vendor Identification</th><td>The implementing agency is choosing the contractor or supplier.*</td></tr>
      <tr><th scope="row">Physical Inspection</th><td>The work or purchase is being inspected on the ground, usually before a payment.*</td></tr>
      <tr><th scope="row">Work partially Completed</th><td>Some payments have been made for work done; the work is not finished.</td></tr>
      <tr><th scope="row">Work Completed</th><td>The final payment was made and the work was marked complete on the portal.</td></tr>
    </tbody></table>
    <p class="muted small">* The portal does not define these stages; this is our plain reading of the names. If you know better, tell us.</p>

    <h2>Look up your MP's works on the official portal</h2>
    <ol class="steps">
      <li>Open <a href="https://mplads.mospi.gov.in/" target="_blank" rel="noopener">mplads.mospi.gov.in</a> and tap <b>Dashboard</b> in the top menu.</li>
      <li>A notice titled "What you need to know about the process…" opens. Read it if you like, then close it with the <b>×</b> at its top right.${img("02_dashboard_popup.jpg", "The notice that opens over the dashboard; close it with the × at the top right.")}</li>
      <li>Choose <b>Lok Sabha</b> (or <b>Rajya Sabha</b>) at the top right. The tiles show totals for the whole country.${img("03_dashboard.jpg", "The dashboard with the notice closed: the search box with its filter icon, the Lok Sabha and Rajya Sabha buttons, and the all-India totals.")}</li>
      <li>Tap the <b>filter icon</b> (the sliders at the right end of the search box). Pick the <b>Tenure</b> (the current one is 18th Lok Sabha), your <b>State</b>, your <b>Constituency</b> and, if you like, the <b>MP Name</b>. Tap <b>Search</b>.</li>
      <li>The search box now shows your choices, and the tiles show totals for that MP: <b>Allocated Limit</b>, <b>Works Recommended</b>, <b>Works Sanctioned</b>, <b>Works Completed</b> and <b>Expenditure</b>.${img("05_after_search.jpg", "After Search: 18th Lok Sabha, Bangalore South, Karnataka, with that constituency's totals.")}</li>
      <li>Tap a tile, for example <b>Works Recommended</b>. The list of works loads below the tiles, 20 to a page.${img("06_works_table.jpg", "The Works Recommended list for one constituency, with Excel, CSV and PDF download buttons.")}</li>
      <li>Use the <b>Search</b> box above the list to find a place or a recommendation letter number (it looks like <code>LN/MP341/2025-2026/170</code>; Nagarika shows it on every work).</li>
      <li>Tap <b>Excel</b>, <b>CSV</b> or <b>PDF</b> to download the list.</li>
      <li>Some works have <b>Attachments</b> (photos of the asset at each stage, sanction orders) and <b>Reviews and Rating</b> from citizens.</li>
    </ol>

    <h2>Suggest a work to your MP</h2>
    <ol class="steps">
      <li>On <a href="https://mplads.mospi.gov.in/" target="_blank" rel="noopener">mplads.mospi.gov.in</a>, tap <b>Citizen Request</b>.</li>
      <li>Log in with your mobile number and the OTP sent to it.</li>
      <li>Fill in the place (state, district, city or village, ward, locality), choose your MP, and describe the work, items and approximate cost. Attach a photo if useful.</li>
      <li>Submit, and use <b>Track Request</b> later to see what happened.</li>
    </ol>
    <p class="muted small">The portal says the choice of works "rests entirely at the discretion of the concerned MP". A request is a suggestion, not an application.</p>

    <h2>What the portal does not show</h2>
    <ul>
      <li>Works from before April 2023: the first four years of the 17th Lok Sabha (2019-20 to 2022-23) and Rajya Sabha works before 2023-24 were handled on paper by the districts.</li>
      <li>Works that are finished but not yet marked complete by the implementing agency still show as in progress.</li>
      <li>"Expenditure" is payments released to vendors, not the value of what was built.</li>
    </ul>

    <h2>If something looks wrong</h2>
    <ul>
      <li>Ask the district authority named on the work (the Collector or Deputy Commissioner's MPLADS cell), quoting the recommendation letter number.</li>
      <li>File an RTI with the same office for the sanction order, the implementing agency's progress reports or the completion certificate.</li>
      <li>MoSPI, the ministry that runs the scheme: <a href="mailto:cna-mplads@mospi.gov.in">cna-mplads@mospi.gov.in</a>.</li>
    </ul>

    <h2>How Nagarika gets this data</h2>
    <p>The public dashboard loads its figures from the portal's own data service, which needs no login. Nagarika reads the same lists the dashboard shows (works recommended, sanctioned and completed) once a day, for every state, and links each work back to the portal.</p>
    </article>`;
  if (parseHash().q.get("s") === "stages") setTimeout(() => document.getElementById("stages")?.scrollIntoView(), 0);
}

function guideRti() {
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Guides", "#/guides"], ["RTI"]])}
    <article class="guide">
    <h1>Filing an RTI for missing details</h1>
    <p class="lede">The Right to Information Act, 2005 lets any citizen ask a public authority for records it holds: work orders, bills, sanction orders, inspection reports. It is the main way to fill in what a portal leaves out. Every work page on Nagarika has an "Ask about this work" box that writes the application for you.</p>

    <h2>Before you start</h2>
    <ul>
      <li><b>Ask for records, not opinions.</b> "A copy of the work order" or "the dates and amounts of bills paid" gets answers. "Why is the road so bad?" usually does not.</li>
      <li><b>Quote the reference.</b> Give the tender ID, work-order number or MPLADS recommendation letter number shown on Nagarika. It tells the office exactly which file to open.</li>
      <li><b>You don't have to give a reason</b> for asking (section 6(2)), only details needed to contact you.</li>
    </ul>

    <h2>Where to send it</h2>
    <ul>
      <li>Address it to the <b>Public Information Officer (PIO)</b> of the office that holds the file: for road works, the agency and division named on the work (for example the city corporation's zone or division office, or the PWD division); for MPLADS works, the District Collector or Deputy Commissioner's office, which sanctions and pays for them.</li>
      <li>If you send it to the wrong office, the PIO must transfer it to the right public authority within 5 days (section 6(3)), so don't let uncertainty stop you.</li>
      <li><b>Central government bodies</b> (central ministries, departments and many of their offices) accept applications online at <a href="https://rtionline.gov.in" target="_blank" rel="noopener">rtionline.gov.in</a>. Several states run their own online RTI portals; otherwise send it by post or hand it in.</li>
    </ul>

    <h2>Fee</h2>
    <ul>
      <li>The application fee is ₹10 for central bodies and in most states. Each state sets its own fee and payment methods (postal order, demand draft, court-fee stamp, cash or online), so check what the office accepts.</li>
      <li>People below the poverty line pay no fee; enclose a copy of the BPL certificate.</li>
      <li>Copies of documents cost extra, usually a few rupees a page. The PIO tells you the amount.</li>
    </ul>

    <h2>Sending it</h2>
    <ol class="steps">
      <li>Open the work on Nagarika, scroll to <b>Ask about this work</b>, fill in your name and address, and read the draft. Change anything that doesn't fit.</li>
      <li>Print it and sign it, or copy it into the online portal.</li>
      <li>Attach the fee. Keep a copy of everything.</li>
      <li>Send it by Speed Post or registered post, or hand it in and ask for a dated acknowledgement. Note the date it was received: the deadlines run from that day.</li>
    </ol>

    <h2>Deadlines</h2>
    <table class="fields"><tbody>
      <tr><th scope="row">Reply from the PIO</th><td>Within 30 days of receipt (section 7(1)). 48 hours if it concerns someone's life or liberty. 5 more days if it was received through an Assistant PIO.</td></tr>
      <tr><th scope="row">No reply in time</th><td>The information must then be given free of charge (section 7(6)).</td></tr>
      <tr><th scope="row">First appeal</th><td>If there is no reply, or the reply is incomplete or refused, appeal to the First Appellate Authority, an officer senior to the PIO in the same office, within 30 days (section 19(1)). No fee is charged under the central rules.</td></tr>
      <tr><th scope="row">Second appeal</th><td>If the first appeal fails, appeal to the State Information Commission (or the Central Information Commission for central bodies) within 90 days (section 19(3)).</td></tr>
    </tbody></table>

    <h2>What you can ask for on a public work</h2>
    <ul>
      <li>The work order or agreement, the estimate and bill of quantities.</li>
      <li>The contractor's name, the date of award, the completion date and any extensions.</li>
      <li>Bills paid, with dates and amounts, and the measurement book entries behind them.</li>
      <li>Quality test reports, inspection reports and the defect liability period.</li>
      <li>For MPLADS: the sanction order, the implementing agency, funds released, utilisation and completion certificates.</li>
      <li>Inspection of the records or the work itself, and certified samples of material used (section 2(j)).</li>
    </ul>

    <p class="muted small">This guide summarises the Act; it is not legal advice. The full text is on <a href="https://rti.gov.in" target="_blank" rel="noopener">rti.gov.in</a>. Spotted something out of date? <a href="${REPO}/issues">Tell us</a>.</p>
    </article>`;
}

async function eduData() {
  try { return await load("education.json"); } catch { return null; }
}

async function guideEducation() {
  const ext = (url, label) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
  const ed = await eduData();
  const states = ed ? [...new Set(ed.portals.map(p => p.state))].filter(s => s !== "National").sort() : [];
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Guides", "#/guides"], ["Children's education"]])}
    <article class="guide">
    <h1>Help for children's education</h1>
    <p class="lede">For parents, teachers and volunteers working with children from poor or disadvantaged families: what the government provides, how to claim it, and how to find organisations that help. Everything here links to the official source.</p>
    ${states.length ? `<div class="note"><label class="select"><span><b>Your state:</b> admission portal, scholarship portals and their current last dates</span>
      <select id="edst"><option value="">Choose a state</option>${states.map(st => `<option value="${slugify(st)}">${esc(st)}</option>`).join("")}</select></label></div>` : ""}

    <h2>Start here: find every scheme a child qualifies for</h2>
    <p>${ext("https://www.myscheme.gov.in", "myScheme")} is the Government of India's search for central and state schemes. Choose the state, the child's age, gender and category (SC, ST, OBC, minority, disability, below poverty line) and it lists the schemes they are eligible for, with the documents needed and the link to apply.</p>

    <h2>Schools near you</h2>
    <p><a href="#/schools">Find schools by district</a>: every government, aided and private school in the UDISE+ list, with the classes it teaches and how far it is from you.</p>

    <h2>Free schooling</h2>
    <table class="fields"><tbody>
      <tr><th scope="row">Right to Education</th><td>Every child aged 6 to 14 has the right to free education in a neighbourhood school up to class 8 (RTE Act, 2009). Government schools cannot charge fees.</td></tr>
      <tr><th scope="row">25% of private school seats</th><td>Private unaided schools must keep 25% of entry-level seats free for children from weaker sections and disadvantaged groups (section 12(1)(c)); the state pays the fee. Admission is usually through an online lottery run by the state education department early in the year. <b>Karnataka:</b> since a 2018 rule change, these seats are offered only where there is no government or aided school in the neighbourhood, so very few are available.</td></tr>
      <tr><th scope="row">School meals (PM POSHAN)</th><td>A free hot cooked meal every school day for children in classes 1 to 8 (and pre-primary classes) in government and government-aided schools.</td></tr>
      <tr><th scope="row">Textbooks and uniforms</th><td>Free textbooks, and uniforms for many groups, in government schools under the Samagra Shiksha scheme. What is given varies by state; ask the school or the Block Education Officer.</td></tr>
      <tr><th scope="row">Residential schools for girls</th><td>Kasturba Gandhi Balika Vidyalayas: free residential schools for girls from SC, ST, OBC, minority and below-poverty-line families, from class 6. Ask the district education office for the nearest one.</td></tr>
    </tbody></table>

    <h2>Scholarships</h2>
    <table class="fields"><tbody>
      <tr><th scope="row">National Scholarship Portal</th><td>${ext("https://scholarships.gov.in", "scholarships.gov.in")} is where most central scholarships are applied for, once a year. For school children the main ones are the pre-matric scholarships for SC, ST, OBC and minority students, which now cover classes 9 and 10 only.</td></tr>
      <tr><th scope="row">National Means-cum-Merit Scholarship</th><td>₹12,000 a year from class 9 to class 12 for children in government, aided and local-body schools whose family income is up to ₹3.5 lakh a year. Children sit a selection exam in class 8, held by the state; the school registers them. Then apply on the National Scholarship Portal.</td></tr>
      <tr><th scope="row">State scholarships</th><td>Each state runs its own as well. <b>Karnataka:</b> the ${ext("https://ssp.karnataka.gov.in", "State Scholarship Portal (SSP)")}. Search "[your state] scholarship portal" or use myScheme.</td></tr>
    </tbody></table>

    <h2>Documents to get ready</h2>
    <p>Most applications ask for some of these, so getting them early saves missed deadlines:</p>
    <ul>
      <li>The child's Aadhaar, and a parent's</li>
      <li>Caste certificate and income certificate, from the taluk or tahsildar office (in many states also online)</li>
      <li>A bank account, often in the child's name and linked to Aadhaar, for scholarship payments</li>
      <li>Last year's marks card and the school's bonafide or study certificate</li>
      <li>Disability certificate (UDID card), if it applies</li>
    </ul>

    <h2>Organisations that help</h2>
    <ul>
      <li>${ext("https://ngodarpan.gov.in/search-ngo", "NGO Darpan")} (NITI Aayog) lists NGOs registered with the government. Search by state, district and sector ("Education & Literacy", "Children") to find groups working near you, and to check that an organisation is registered.</li>
      <li>The ${ext("https://www.csr.gov.in", "National CSR Portal")} (Ministry of Corporate Affairs) shows which companies spend their CSR money on education, and in which states and districts. Useful when looking for funding or partners for a drive.</li>
    </ul>

    <h2>Child safety</h2>
    <p>Call <b>1098</b> (Childline), free, day and night, for a child who is in danger, being abused, out of school because of child labour, or lost.</p>

    <h2>If a child is refused something they are entitled to</h2>
    <ol class="steps">
      <li>Talk to the head teacher and the School Management Committee, which includes parents.</li>
      <li>Write to the Block Education Officer, and then the District Deputy Director of Public Instruction (or the equivalent in your state). Keep a copy.</li>
      <li>Complain to the State Commission for Protection of Child Rights, which hears RTE complaints.</li>
      <li>Use an <a href="#/guides/rti">RTI</a> to ask why: for example, the list of RTE lottery seats and admissions in a school, or the scholarship applications pending at an office.</li>
    </ol>

    <h2>For volunteers running education drives</h2>
    <ul>
      <li>Note each child's school, class and category: it decides which schemes apply.</li>
      <li>Check myScheme with the family, and note the scholarship portal's opening and closing dates, which change every year.</li>
      <li>Help families get certificates and bank accounts well before the scholarship season.</li>
      <li>Children not enrolled in any school can be admitted to a government school at any time of the year, in the class suited to their age, with extra help to catch up (RTE section 4).</li>
    </ul>

    <p class="muted small">Schemes, amounts and rules change. Always check the official portal before applying. Spotted something out of date? <a href="${REPO}/issues">Tell us</a>.</p>
    </article>`;
  document.getElementById("edst")?.addEventListener("change", e => { if (e.target.value) location.hash = "#/guides/education/" + e.target.value; });
}

const EDU_KIND = { rte: "Free seats in private schools (RTE 25%)", scholarship: "Scholarships" };

function eduDeadlines(list) {
  if (!list?.length) return "";
  const today = new Date().toISOString().slice(0, 10);
  const levels = [...new Set(list.map(d => d.level))];
  const item = d => {
    const left = Math.round((new Date(d.last_date) - new Date(today)) / 864e5);
    const tag = left < 0 ? '<span class="badge closed">Closed</span>'
      : `<span class="badge open">${left === 0 ? "Last day today" : left + (left === 1 ? " day" : " days") + " left"}</span>`;
    return `<li>${esc(d.scheme)}: <b>${date(d.last_date)}</b> ${tag}</li>`;
  };
  return levels.map(l => {
    const ds = list.filter(d => d.level === l).sort((a, b) => (a.last_date < today) - (b.last_date < today) || a.last_date.localeCompare(b.last_date));
    return `<h4>Last dates: ${esc(l)}</h4><ul class="eduldates">${ds.map(item).join("")}</ul>`;
  }).join("");
}

function eduPortal(p) {
  const seen = p.loads
    ? `Checked ${date(p.checked)}: the page opened.`
    : `Checked ${date(p.checked)}: the page did not open${p.last_loaded ? `. What is shown below is from ${date(p.last_loaded)}` : ""}. Try again later.`;
  return `<section class="eduportal">
    <h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a></h3>
    ${p.about ? `<p>${esc(p.about)}</p>` : ""}
    <p class="muted small">${seen}</p>
    ${eduDeadlines(p.deadlines)}
    ${p.helplines?.length ? `<p>Helpline shown on the portal: ${p.helplines.map(h => `<a href="tel:${esc(h.replace(/\D/g, ""))}">${esc(h)}</a>`).join(", ")}</p>` : ""}
    ${p.notices?.length ? `<details${p.deadlines?.length ? "" : " open"}><summary>Links on the official page about admissions and scholarships</summary><ul>${p.notices.map(n =>
      `<li><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.text)}</a>${n.date ? ` <span class="muted small">(${date(n.date)})</span>` : ""}</li>`).join("")}</ul></details>` : ""}
  </section>`;
}

async function educationState(slug) {
  const ed = await eduData();
  const mine = (ed?.portals || []).filter(p => slugify(p.state) === slug);
  if (!mine.length) return notFound();
  const st = mine[0].state;
  const nsp = ed.portals.filter(p => p.state === "National");
  const group = kind => mine.filter(p => p.kind === kind);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Guides", "#/guides"], ["Children's education", "#/guides/education"], [st]])}
    <article class="guide">
    <h1>Help for children's education in ${esc(st)}</h1>
    <p class="lede">The official ${esc(st)} portals for free school seats and scholarships, with the last dates and notices they show. We open each page from India and read it again regularly, but always confirm on the portal before applying.</p>
    ${group("rte").length ? `<h2>${EDU_KIND.rte}</h2>
      <p>Private unaided schools keep 25% of entry-level seats free for children from weaker sections and disadvantaged groups. Admission is through the state's online application and lottery, usually early in the year.</p>
      ${group("rte").map(eduPortal).join("")}` : ""}
    <h2>${EDU_KIND.scholarship}</h2>
    ${group("scholarship").length ? group("scholarship").map(eduPortal).join("") : `<p>We have not added a ${esc(st)} scholarship portal yet. Use <a href="https://www.myscheme.gov.in" target="_blank" rel="noopener">myScheme</a> to find the state's schemes.</p>`}
    <h3 class="sub">Central scholarships, for every state</h3>
    ${nsp.map(eduPortal).join("")}
    <h2>Schools near you</h2>
    <p><a href="#/schools/${slug}">Every school in ${esc(st)}, by district</a>: government, aided and private, the classes each teaches, and a distance sort from where you are.</p>
    <h2>Organisations working on education near you</h2>
    <p><a href="https://ngodarpan.gov.in/search-ngo" target="_blank" rel="noopener">NGO Darpan's search</a> (NITI Aayog) lists non-profits registered with the government. Choose ${esc(st)} as the state, then your district, and education under Sector. The site asks you to type a captcha before it shows results, so we link to it rather than copy its list. Each result has a DARPAN ID, which shows the organisation is registered.</p>
    <h2>Also useful</h2>
    <ul>
      <li><a href="https://www.myscheme.gov.in" target="_blank" rel="noopener">myScheme</a>: every central and ${esc(st)} scheme a child qualifies for.</li>
      <li><b>1098</b> (Childline): free, day and night, for a child in danger or out of school because of child labour.</li>
      <li><a href="#/guides/education">The full guide</a>: free schooling, documents to get ready, and what to do if a child is refused.</li>
    </ul>
    <p class="muted small">Dates and links are read automatically from the official pages and may lag behind them. Spotted something wrong, or know a portal we are missing? <a href="${REPO}/issues/new?title=${enc("Education help: " + st)}">Tell us</a>.</p>
    </article>`;
}

// ---------- schools (UDISE+) ----------
const SCHOOL_MG = { G: "Government", A: "Government-aided", P: "Private", U: "Unrecognised" };
let here = null;   // the visitor's location, only if they ask to sort by distance

async function schoolRows(ss, ds) {
  const key = `_sch_${ss}_${ds}`;
  if (!cache[key]) cache[key] = load(`schools/${ss}/${ds}.json`).then(d => table2objects(d).map(o => {
    o.name = titleCase(o.name.replace(/^\d+\s*-\s*/, ""));
    o.village = titleCase(o.village);
    o.block = titleCase(o.block);
    return o;
  }));
  return cache[key];
}

const classes = s => s.from == null ? "" : s.to == null ? `${s.from}` : s.from === 0 ? `Pre-primary to ${s.to}` : `${s.from} to ${s.to}`;

function km(a, b) {
  const r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function schoolView() {
  const sorts = {
    name: ["Name", (a, b) => a.name.localeCompare(b.name)],
    students: ["Most students", (a, b) => (b.students || 0) - (a.students || 0)],
  };
  if (here) sorts.near = ["Nearest to me", (a, b) => (a.lat == null) - (b.lat == null) || km(here, a) - km(here, b)];
  return {
    noun: "schools",
    keys: ["name", "village", "block", "pin", "code"],
    placeholder: "Filter by school, village, block or PIN code",
    sort: here ? "near" : "name",
    sorts,
    filters: {
      "": ["All", () => true],
      gov: ["Government", s => s.mg === "G"],
      aided: ["Government-aided", s => s.mg === "A"],
      private: ["Private", s => s.mg === "P"],
      girls: ["Girls only", s => s.type === "G"],
      primary: ["Classes 1 to 5", s => s.from != null && s.from <= 1 && s.to >= 5],
      sec: ["Class 10", s => s.to >= 10 && s.from <= 10],
      hsec: ["Class 12", s => s.to >= 12],
    },
    table: rows => `<table class="works">
      <thead><tr><th>School</th><th>Run by</th><th>Classes</th><th class="num">Teachers</th><th class="num">Students</th></tr></thead>
      <tbody>${rows.map(s => `<tr>
        <td data-label="School">${esc(s.name)}${s.type === "G" ? ' <span class="badge open">Girls</span>' : s.type === "B" ? ' <span class="badge closed">Boys</span>' : ""}
          <div class="sub">${[s.village, s.block, s.pin].filter(Boolean).map(esc).join(" · ")}${here && s.lat != null ? ` · ${km(here, s).toFixed(1)} km away` : ""}
          · UDISE code ${esc(s.code)}${s.lat != null ? ` · <a href="https://www.openstreetmap.org/?mlat=${s.lat}&amp;mlon=${s.lon}#map=17/${s.lat}/${s.lon}" target="_blank" rel="noopener">Map</a>` : ""}</div></td>
        <td data-label="Run by">${esc(SCHOOL_MG[s.mg])}<div class="sub">${esc(s.management)}</div></td>
        <td data-label="Classes">${esc(classes(s)) || NP}</td>
        <td data-label="Teachers" class="num">${s.teachers ?? NP}</td>
        <td data-label="Students" class="num">${s.students == null ? NP : fmtN(s.students)}</td></tr>`).join("")}</tbody></table>`,
  };
}

const schoolSource = idx => `<p class="muted small">Source: UDISE+ (Ministry of Education), ${esc(idx.as_of.replace(/^UDISE\+ data /, ""))}, via the <a href="${esc(idx.source)}" target="_blank" rel="noopener">India Data Portal</a> (Open Data Commons Attribution licence). Schools opened or closed since then are not shown; for a school's latest details, search its UDISE code on <a href="https://kys.udiseplus.gov.in/" target="_blank" rel="noopener">Know Your School</a>.</p>`;

async function schoolsHome() {
  const idx = await load("schools_index.json");
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Guides", "#/guides"], ["Children's education", "#/guides/education"], ["Schools"]])}
    <h1>Schools near you</h1>
    <p class="lede">Every recognised and unrecognised school in the government's UDISE+ list, by district: who runs it, the classes it teaches, and its teachers and students.</p>
    <div class="cards">${idx.states.map(s => `<a class="card" href="#/schools/${s.slug}"><h3>${esc(s.state)}</h3><p class="tag">${fmtN(s.districts.reduce((n, d) => n + d.schools, 0))} schools</p></a>`).join("")}</div>
    ${schoolSource(idx)}`;
}

async function schoolsState(ss) {
  const idx = await load("schools_index.json");
  const s = idx.states.find(x => x.slug === ss);
  if (!s) return notFound();
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Children's education", "#/guides/education"], ["Schools", "#/schools"], [s.state]])}
    <h1>Schools in ${esc(s.state)}</h1>
    <p>Choose a district.</p>
    <table class="works"><thead><tr><th>District</th><th class="num">Schools</th><th class="num">Government</th><th class="num">Aided</th><th class="num">Private</th></tr></thead>
    <tbody>${s.districts.map(d => `<tr><td data-label="District"><a href="#/schools/${ss}/${d.slug}">${esc(d.name)}</a></td>
      <td data-label="Schools" class="num">${fmtN(d.schools)}</td><td data-label="Government" class="num">${fmtN(d.government)}</td>
      <td data-label="Aided" class="num">${fmtN(d.aided)}</td><td data-label="Private" class="num">${fmtN(d.private)}</td></tr>`).join("")}</tbody></table>
    ${schoolSource(idx)}`;
}

async function schoolsDistrict(ss, ds) {
  const idx = await load("schools_index.json");
  const s = idx.states.find(x => x.slug === ss);
  const d = s && s.districts.find(x => x.slug === ds);
  if (!d) return notFound();
  const list = await schoolRows(ss, ds);
  const ed = await eduData();
  const rteLink = ed?.portals.some(p => slugify(p.state) === ss)
    ? `<a href="#/guides/education/${ss}">${esc(s.state)}'s admission portal</a>` : `<a href="#/guides/education">the education guide</a>`;
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Children's education", "#/guides/education"], ["Schools", "#/schools"], [s.state, `#/schools/${ss}`], [d.name]])}
    <h1>Schools in ${esc(d.name)} district</h1>
    ${stats([[fmtN(d.schools), "Schools"], [fmtN(d.government), "Government"], [fmtN(d.aided), "Government-aided"], [fmtN(d.private), "Private"]])}
    <p class="note">Government schools are free up to class 8 and give free meals, textbooks and often uniforms. Private schools must keep 25% of entry seats free under the RTE Act: see ${rteLink}.</p>
    <p><button type="button" class="btn" id="nearme">${here ? "Update my location" : "Sort by distance from me"}</button> <span class="muted small" id="nearmsg">Your location stays in your browser; it is not sent anywhere.</span></p>
    <div id="res"></div>
    ${schoolSource(idx)}`;
  results(document.getElementById("res"), list, schoolView());
  document.getElementById("nearme").onclick = () => {
    const msg = document.getElementById("nearmsg");
    if (!navigator.geolocation) { msg.textContent = "This browser can't share its location."; return; }
    msg.textContent = "Finding your location…";
    navigator.geolocation.getCurrentPosition(p => {
      here = { lat: p.coords.latitude, lon: p.coords.longitude };
      setQuery({ sort: "near", page: "" });
      route();
    }, () => { msg.textContent = "Location not available. Filter by village or PIN code instead."; }, { timeout: 15000 });
  };
}

function notFound() {
  app.innerHTML = `${crumbs([["Home", "#/"], ["Not found"]])}<h1>Page not found</h1><p><a href="#/">Go to the home page</a></p>`;
}

// ---------- router ----------
let lastPath = null;
async function route() {
  maps.forEach(m => m.remove());
  maps = [];
  const { parts } = parseHash();
  const path = parts.join("/");
  const keepY = path === lastPath ? window.scrollY : 0;
  lastPath = path;
  const section = ["city", "state", "work", "overdue", "roads"].includes(parts[0]) ? "roads"
    : ["mp", "mpwork"].includes(parts[0]) ? "mp" : parts[0] || "";
  document.querySelectorAll(".top nav a").forEach(a => {
    a.toggleAttribute("aria-current", a.getAttribute("href") === "#/" + section);
  });
  try {
    if (!parts.length) await home();
    else if (parts[0] === "search") await search();
    else if (parts[0] === "roads") await roadsHome();
    else if (parts[0] === "city" && parts[2] === "ward") await ward(parts[1], parts[3]);
    else if (parts[0] === "city" && parts[2] === "cards") await wardCompare(parts[1]);
    else if (parts[0] === "city") await city(parts[1]);
    else if (parts[0] === "state") await state(parts[1]);
    else if (parts[0] === "work") await work(parts.slice(1).join("/"));
    else if (parts[0] === "overdue") await overdue();
    else if (parts[0] === "mp" && parts[2]) await mpConstituency(parts[1], parts[2]);
    else if (parts[0] === "mp" && parts[1]) await mpState(parts[1]);
    else if (parts[0] === "mp") await mpHome();
    else if (parts[0] === "mla" && parts[2]) await mlaConstituency(parts[1], parts[2]);
    else if (parts[0] === "mla" && parts[1]) await mlaState(parts[1]);
    else if (parts[0] === "mla") await mlaHome();
    else if (parts[0] === "mlawork") await mlaWork(parts[1], parts.slice(2).join("/"));
    else if (parts[0] === "mpwork") await mpWork(parts[1], parts.slice(2).join("/"));
    else if (parts[0] === "schools" && parts[2]) await schoolsDistrict(parts[1], parts[2]);
    else if (parts[0] === "schools" && parts[1]) await schoolsState(parts[1]);
    else if (parts[0] === "schools") await schoolsHome();
    else if (parts[0] === "about") await about();
    else if (parts[0] === "guides" && parts[1] === "mplads") await guideMplads();
    else if (parts[0] === "guides" && parts[1] === "rti") guideRti();
    else if (parts[0] === "guides" && parts[1] === "education" && parts[2]) await educationState(parts[2]);
    else if (parts[0] === "guides" && parts[1] === "education") await guideEducation();
    else if (parts[0] === "guides") await guides();
    else notFound();
    if (toResults) document.getElementById("res")?.scrollIntoView({ block: "start" });
    else window.scrollTo(0, keepY);
    toResults = false;
  } catch (e) {
    app.innerHTML = `<h1>Could not load data</h1><p class="muted">${esc(e.message)}. Try reloading the page.</p>`;
  }
}

window.addEventListener("hashchange", route);
route();
