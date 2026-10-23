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
  { key: "water", name: "Water supply & sewerage" },
  { key: "lights", name: "Streetlights" },
  { key: "buildings", name: "Schools, hospitals & offices" },
  { key: "parks", name: "Parks & lakes" },
  { key: "waste", name: "Garbage & sanitation" },
  { key: "mla", name: "MLA funds" },
];

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

const KIND_ORDER = ["City", "Lok Sabha constituency", "State", "Ward", "Assembly constituency", "Town or district", "PIN code"];

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
      ${view.noFilterBox ? "" : `<input class="input" type="search" id="rq" value="${esc(text)}" placeholder="${esc(view.placeholder || "Filter these works")}" aria-label="Filter these works">`}
      <label class="select"><span>Sort</span><select id="rs">
        ${text ? `<option value=""${!sortKey ? " selected" : ""}>Best match</option>` : ""}
        ${Object.entries(view.sorts).map(([k, [l]]) => `<option value="${k}"${k === sortKey ? " selected" : ""}>${l}</option>`).join("")}
      </select></label>
    </div>
    <div class="chips" role="group" aria-label="Filter">${Object.entries(view.filters).map(([k, [l]]) =>
      `<button type="button" class="chip" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join("")}</div>
    <p class="count">${list.length ? `Showing ${fmtN(from + 1)}–${fmtN(from + rows.length)} of ${fmtN(list.length)} works` : "No works match. Try fewer or shorter words."}</p>
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
      pending: ["Awaiting sanction", w => STAGE_PENDING(w.stage)],
    },
    table: rows => `<table class="works">
      <thead><tr><th>Work</th><th>Type</th><th class="num">Amount</th><th>Recommended</th><th>Stage</th></tr></thead>
      <tbody>${rows.map(w => `<tr>
        <td data-label="Work"><a href="#/mpwork/${stateSlug}/${enc(w.id)}">${esc(w.description || w.activity)}</a>
          ${showConstituency ? `<div class="sub">${esc(w.constituency)} · ${esc(person(w.mp_name))}</div>` : ""}</td>
        <td data-label="Type">${esc(w.activity) || NP}</td>
        <td data-label="Amount" class="num">${inr(w.amount) || NP}</td>
        <td data-label="Recommended">${date(w.recommended_date) || NP}</td>
        <td data-label="Stage">${esc(w.stage) || NP}</td></tr>`).join("")}</tbody></table>`,
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

// ---------- pages: home and search ----------
async function home() {
  const [meta, mp] = await Promise.all([load("meta.json"), load("mplads_index.json").catch(() => [])]);
  const mpWorksN = mp.reduce((a, s) => a + s.works, 0);
  const counts = { roads: `${fmtN(meta.total)} works`, mp: mpWorksN ? `${fmtN(mpWorksN)} works` : "" };
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
        <p class="small"><a href="#/city/${slug}/ward/_none">${fmtN(c.unmatched)} works with no ward named in the source</a></p>
      </div>
    </div>
    <h2>All works in ${esc(c.name)}</h2>
    <div id="res"></div>`;
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
    ${ww.some(x => x.ward_match.startsWith("crosswalk")) ? `<p class="note">Some works were filed under an older ward map. They are listed in every current ward that overlaps the old ward, so they can also appear in a neighbouring ward.</p>` : ""}
    <h2>Road works</h2>
    <div id="res"></div>
    ${mpHtml}`;
  results(document.getElementById("res"), ww, roadView());
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
  const row = (label, val) => `<tr><th scope="row">${label}</th><td>${val || NP}</td></tr>`;
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Road works", "#/roads"], w.city ? [cityName, `#/city/${w.city}`] : [w.state, `#/state/${enc(w.state)}`], ["Work"]])}
    <h1 class="title">${esc(w.title)}</h1>
    <p>${badge(w)}</p>
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
    <p class="small"><a href="${REPO}/issues/new?title=${enc("Data: " + w.id)}">Report a mistake</a></p>`;
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
    <p class="muted small">Source: <a href="https://mplads.mospi.gov.in/digigov/dashboard.html">eSAKSHI MPLADS dashboard</a>, Ministry of Statistics and Programme Implementation.</p>`;
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
    ${stats([[fmtN(c.works), "Works recommended"], [inr(c.sanctioned) || "—", "Sanctioned"], [fmtN(c.completed), "Completed"], [inr(c.spent) || "—", "Spent on completed works"]])}
    <div id="res"></div>
    <p class="muted small">MPs may also recommend some works outside their constituency, so a few works here are in other districts.</p>`;
  results(document.getElementById("res"), list, mpView(slug, false));
}

async function mpWork(slug, id) {
  const w = (await mpWorks(slug)).find(x => x.id === id);
  if (!w) return notFound();
  const idx = await load("mplads_index.json");
  const s = idx.find(x => x.slug === slug);
  const row = (label, val) => `<tr><th scope="row">${label}</th><td>${val || NP}</td></tr>`;
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["MP funds", "#/mp"], [s.state, `#/mp/${slug}`], [w.constituency, `#/mp/${slug}/${w.constituency_id}`], ["Work"]])}
    <h1 class="title">${esc(w.description || w.activity)}</h1>
    <table class="fields"><tbody>
      ${row("MP", esc(person(w.mp_name)))}
      ${row("Constituency", `<a href="#/mp/${slug}/${w.constituency_id}">${esc(w.constituency)}</a>`)}
      ${row("Type of work", esc(w.activity))}
      ${row("Category", esc(w.category))}
      ${row("Implementing agency", esc(titleCase(w.implementing_agency)))}
      ${row("Recommended", [date(w.recommended_date), inr(w.recommended_amount)].filter(Boolean).join(" · "))}
      ${row("Sanctioned", [date(w.sanction_date), inr(w.sanction_amount)].filter(Boolean).join(" · "))}
      ${row("Stage", esc(w.stage))}
      ${row("Completed", [date(w.completed_date), w.actual_amount ? `${inr(w.actual_amount)} spent` : ""].filter(Boolean).join(" · "))}
      ${row("Recommendation letter", esc(w.letter_no))}
    </tbody></table>
    <h2>Official source</h2>
    <p><a class="btn" href="https://mplads.mospi.gov.in/digigov/dashboard.html" target="_blank" rel="noopener">Open eSAKSHI dashboard</a></p>
    <p class="muted small">On the dashboard choose ${esc(s.state)} › ${esc(w.constituency)}, open "Works Recommended" and search letter ${esc(w.letter_no)}. Last checked ${date(w.last_checked)}.</p>
    <p class="small"><a href="${REPO}/issues/new?title=${enc("Data: " + w.id)}">Report a mistake</a></p>`;
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
    else if (parts[0] === "city") await city(parts[1]);
    else if (parts[0] === "state") await state(parts[1]);
    else if (parts[0] === "work") await work(parts.slice(1).join("/"));
    else if (parts[0] === "overdue") await overdue();
    else if (parts[0] === "mp" && parts[2]) await mpConstituency(parts[1], parts[2]);
    else if (parts[0] === "mp" && parts[1]) await mpState(parts[1]);
    else if (parts[0] === "mp") await mpHome();
    else if (parts[0] === "mpwork") await mpWork(parts[1], parts.slice(2).join("/"));
    else if (parts[0] === "about") await about();
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
