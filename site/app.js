// Nagarika: a small hash-routed single page app over static JSON.
"use strict";

const app = document.getElementById("app");
const cache = {};
const REPO = "https://github.com/is-this-itt/nagarika";
const PAGE_SIZE = 25;

// Sectors the project will cover. Only "live" ones have data today.
const SECTORS = [
  { key: "roads", name: "Roads, footpaths & drains", live: true },
  { key: "water", name: "Water supply & sewerage" },
  { key: "lights", name: "Streetlights" },
  { key: "buildings", name: "Schools, hospitals & offices" },
  { key: "parks", name: "Parks & lakes" },
  { key: "waste", name: "Garbage & sanitation" },
  { key: "funds", name: "MP & MLA local area funds", link: "https://mplads.mospi.gov.in/digigov/dashboard.html", linkText: "Official MPLADS dashboard" },
];

// ---------- data ----------
async function load(name) {
  if (!cache[name]) cache[name] = fetch("data/" + name).then(r => {
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return r.json();
  });
  return cache[name];
}

async function works() {
  if (!cache._works) {
    cache._works = load("works.json").then(d => d.rows.map(row => {
      const o = {};
      d.fields.forEach((f, i) => { o[f] = row[i]; });
      o.wards = o.ward_ids ? o.ward_ids.split(";") : [];
      o.cost = Number(o.sanctioned_cost) || 0;
      o.paid = Number(o.amount_paid) || 0;
      return o;
    }));
  }
  return cache._works;
}

async function wardLookup() {
  if (!cache._wards) {
    cache._wards = load("wards.json").then(idx => {
      const m = {};
      for (const [city, list] of Object.entries(idx)) {
        m[city] = {};
        for (const [key, no, name, zone, assembly] of list) m[city][key] = { key, no, name, zone, assembly };
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

const FLAG = { overdue: "Overdue", past_estimate: "Past estimated finish" };
const badge = w => w.flag ? `<span class="badge ${w.flag}">${FLAG[w.flag]}</span>` : "";

function finishBy(w) {
  if (!w.deadline) return "";
  return w.deadline_basis === "official" ? date(w.deadline) : `${date(w.deadline)} <span class="muted">(est.)</span>`;
}

function wardLabel(city, w, short = false) {
  if (!w) return "";
  if (city === "bengaluru") {
    const corp = w.zone.replace("Bengaluru ", "").replace(" City Corporation", "");
    return short ? w.name : `${w.name} · ward ${w.no}, ${corp}`;
  }
  return w.name;
}

// ---------- URL state ----------
let refocus = false;    // keep the cursor in the filter box after it updates the URL
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

const SORTS = {
  recent: ["Newest first", (a, b) => (b.published_date || b.first_seen).localeCompare(a.published_date || a.first_seen)],
  cost: ["Highest cost", (a, b) => b.cost - a.cost],
  paid: ["Most paid", (a, b) => b.paid - a.paid],
  finish: ["Finish date", (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999")],
};
const FILTERS = {
  "": ["All", () => true],
  late: ["Past finish date", w => !!w.flag],
  contractor: ["Contractor known", w => !!w.contractor],
  unknown: ["Contractor not published", w => !w.contractor],
};

// The standard results view: count, text filter, sort, filter chips, table, pagination.
// State lives in the URL so back/forward and shared links keep the same view.
function results(el, all, opts = {}) {
  const { q } = parseHash();
  const text = (q.get("q") || "").trim();
  const sort = SORTS[q.get("sort")] ? q.get("sort") : (opts.sort || "recent");
  const filter = FILTERS[q.get("f")] ? q.get("f") : "";
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  let list = all.filter(FILTERS[filter][1]);
  if (terms.length) {
    list = list.filter(w => {
      const hay = `${w.title} ${w.location_text} ${w.place} ${w.agency} ${w.office} ${w.contractor}`.toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }
  list = list.slice().sort(SORTS[sort][1]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, parseInt(q.get("page"), 10) || 1));
  const from = (page - 1) * PAGE_SIZE;
  const rows = list.slice(from, from + PAGE_SIZE);

  el.innerHTML = `
    <div class="toolbar">
      ${opts.noSearch ? "" : `<input class="input" type="search" id="rq" value="${esc(text)}" placeholder="Filter by street, area, contractor…" aria-label="Filter these works">`}
      <label class="select"><span>Sort</span><select id="rs">${Object.entries(SORTS).map(([k, [l]]) =>
        `<option value="${k}"${k === sort ? " selected" : ""}>${l}</option>`).join("")}</select></label>
    </div>
    <div class="chips" role="group" aria-label="Filter">${Object.entries(FILTERS).map(([k, [l]]) =>
      `<button type="button" class="chip" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join("")}</div>
    <p class="count">${list.length ? `Showing ${fmtN(from + 1)}–${fmtN(from + rows.length)} of ${fmtN(list.length)} works` : "No works match."}</p>
    ${rows.length ? workTable(rows, opts) : ""}
    ${pager(page, pages)}`;

  const rq = el.querySelector("#rq");
  if (rq) {
    let t;
    rq.oninput = () => { clearTimeout(t); t = setTimeout(() => { refocus = true; setQuery({ q: rq.value.trim(), page: "" }); }, 400); };
    if (opts.focus || refocus) { rq.focus(); rq.setSelectionRange(rq.value.length, rq.value.length); }
    refocus = false;
  }
  el.querySelector("#rs").onchange = e => setQuery({ sort: e.target.value, page: "" });
  el.querySelectorAll(".chip").forEach(b => { b.onclick = () => setQuery({ f: b.dataset.f, page: "" }); });
  el.querySelectorAll(".pager [data-page]").forEach(b => { b.onclick = () => { toResults = true; setQuery({ page: b.dataset.page }); }; });
}

function workTable(rows, opts) {
  return `<table class="works">
    <thead><tr><th>Work</th><th>Agency &amp; contractor</th><th class="num">Cost</th><th>Finish by</th><th>Status</th></tr></thead>
    <tbody>${rows.map(w => `<tr class="${w.flag}">
      <td data-label="Work"><a href="#/work/${enc(w.id)}">${esc(w.title)}</a> ${badge(w)}
        ${opts.where ? `<div class="sub">${opts.where(w)}</div>` : ""}</td>
      <td data-label="Agency"><div>${esc(w.agency) || NP}</div><div class="sub">${w.contractor ? esc(w.contractor) : "Contractor not published"}</div></td>
      <td data-label="Cost" class="num">${inr(w.sanctioned_cost) || (w.paid ? `<span class="sub">paid</span> ${inr(w.paid)}` : NP)}</td>
      <td data-label="Finish by">${finishBy(w) || NP}</td>
      <td data-label="Status">${esc(w.status) || NP}</td>
    </tr>`).join("")}</tbody></table>`;
}

function pager(page, pages) {
  if (pages <= 1) return "";
  const nums = new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages));
  const seq = [...nums].sort((a, b) => a - b);
  let html = "", prev = 0;
  for (const n of seq) {
    if (n - prev > 1) html += '<span class="gap">…</span>';
    html += n === page ? `<span class="current" aria-current="page">${n}</span>` : `<button type="button" data-page="${n}">${n}</button>`;
    prev = n;
  }
  return `<nav class="pager" aria-label="Pages">
    <button type="button" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>‹ Prev</button>
    ${html}
    <button type="button" data-page="${page + 1}" ${page === pages ? "disabled" : ""}>Next ›</button></nav>`;
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

// ---------- pages ----------
async function home() {
  const meta = await load("meta.json");
  const states = Object.entries(meta.states).sort((a, b) => b[1].works - a[1].works);
  app.innerHTML = `
    <section class="hero">
      <h1>Why is my road dug up?</h1>
      <p class="lede">Who is doing the work, what it costs and when it should finish, from official records. Every entry links to its source.</p>
      <form class="searchbar" id="sf" role="search">
        <input class="input" id="q" type="search" placeholder="Area, street or ward" aria-label="Search area, street or ward" autocomplete="off">
        <button class="btn primary" type="submit">Search</button>
      </form>
      <p class="examples">Try: ${["Jayanagar", "Marina", "Koramangala", "K/E ward", "Hebbal flyover"].map(x =>
        `<button type="button" class="link" data-x="${esc(x)}">${esc(x)}</button>`).join(" · ")}</p>
    </section>
    <div id="results"></div>
    <section>
      <h2>Topics</h2>
      <ul class="sectors">${SECTORS.map(s => s.live
        ? `<li class="live"><a href="#/about">${esc(s.name)}</a><span class="tag">${fmtN(meta.total)} works</span></li>`
        : `<li><span>${esc(s.name)}${s.link ? `<br><a class="small" href="${s.link}" target="_blank" rel="noopener">${esc(s.linkText)}</a>` : ""}</span><span class="tag">Coming soon</span></li>`).join("")}</ul>
    </section>
    <section>
      <h2>Cities with ward maps</h2>
      <div class="cards">${meta.cities.map(c => `
        <a class="card" href="#/city/${c.slug}">
          <h3>${esc(c.name)}</h3>
          <p>${fmtN(c.works)} works · ${c.wards} wards${c.overdue ? ` · ${fmtN(c.overdue)} past finish date` : ""}</p>
        </a>`).join("")}</div>
      <div id="indiamap" class="map"></div>
    </section>
    <section>
      <h2>By state</h2>
      <p class="muted small">Outside the cities above, works are listed by town or district, as the source gives it.</p>
      <table class="plain"><thead><tr><th>State</th><th class="num">Works</th><th class="num">Past finish date</th></tr></thead>
      <tbody>${states.map(([s, v]) => `<tr><td><a href="#/state/${enc(s)}">${esc(s)}</a></td><td class="num">${fmtN(v.works)}</td><td class="num">${fmtN(v.flagged)}</td></tr>`).join("")}</tbody></table>
    </section>
    <p class="muted small">${fmtN(meta.total)} works collected · updated ${date(meta.last_checked)} · <a href="data/works.csv">download CSV</a></p>`;

  const m = newMap("indiamap");
  if (m) {
    m.setView([21.5, 79], 4);
    const centres = { bengaluru: [12.97, 77.59], chennai: [13.06, 80.24], mumbai: [19.07, 72.88] };
    meta.cities.forEach(c => centres[c.slug] && L.circleMarker(centres[c.slug], { radius: 8, weight: 2 }).addTo(m)
      .bindPopup(`<a href="#/city/${c.slug}">${esc(c.name)}</a> · ${fmtN(c.works)} works`));
  }
  const q = document.getElementById("q");
  document.getElementById("sf").onsubmit = e => { e.preventDefault(); location.hash = "#/search?q=" + enc(q.value.trim()); };
  document.querySelectorAll(".examples [data-x]").forEach(b => { b.onclick = () => { location.hash = "#/search?q=" + enc(b.dataset.x); }; });
}

async function search() {
  const { q } = parseHash();
  const text = (q.get("q") || "").trim();
  const [meta, list, wards] = await Promise.all([load("meta.json"), works(), wardLookup()]);
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  const wardHits = [];
  if (terms.length) {
    for (const [city, ws] of Object.entries(wards)) {
      for (const w of Object.values(ws)) {
        const hay = `${w.name} ward ${w.no} ${w.zone} ${w.assembly || ""}`.toLowerCase();
        if (terms.every(t => hay.includes(t))) wardHits.push([city, w]);
      }
    }
  }
  const cityName = s => (meta.cities.find(c => c.slug === s) || {}).name || s;
  app.innerHTML = `
    ${crumbs([["Home", "#/"], ["Search"]])}
    <h1>${text ? `Results for “${esc(text)}”` : "Search"}</h1>
    ${wardHits.length ? `<h2>Wards</h2><ul class="links">${wardHits.slice(0, 24).map(([c, w]) =>
      `<li><a href="#/city/${c}/ward/${enc(w.key)}">${esc(wardLabel(c, w))}</a> <span class="muted small">${esc(cityName(c))}${w.assembly ? ` · ${esc(w.assembly)} constituency` : ""}</span></li>`).join("")}</ul>` : ""}
    <h2>Works</h2>
    <div id="res"></div>`;
  results(document.getElementById("res"), list, { focus: true, where: w => esc(w.city ? cityName(w.city) : [w.place, w.state].filter(Boolean).join(", ")) });
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
    ${crumbs([["Home", "#/"], [c.name]])}
    <h1>${esc(c.name)}</h1>
    ${stats([[fmtN(cw.length), "Road works"], [inr(c.cost) || "—", "Sanctioned, where published"],
      [inr(c.paid) || "—", "Paid, where published"], [fmtN(c.overdue), "Past finish date"]])}
    <div class="split">
      <div>
        <div id="citymap" class="map"></div>
        <div class="legend"><span><i style="background:var(--map0)"></i>None found</span><span><i style="background:var(--map1)"></i>Few</span><span><i style="background:var(--map2)"></i>Some</span><span><i style="background:var(--map3)"></i>Many</span></div>
        <p class="muted small">${esc(c.ward_map)} · <a href="${esc(c.ward_map_source)}">map source</a></p>
      </div>
      <div>
        <div class="toolbar"><input class="input" id="wq" type="search" placeholder="Find a ward" aria-label="Find a ward">
          <label class="select"><span>Sort</span><select id="ws"><option value="name">Name</option><option value="works"${wsort === "works" ? " selected" : ""}>Most works</option></select></label></div>
        <div class="scrollbox"><table class="plain" id="wt"><thead><tr><th>Ward</th><th class="num">Works</th></tr></thead><tbody>
          ${wl.map(w => `<tr data-n="${esc((w.name + " " + w.no + " " + (w.assembly || "")).toLowerCase())}"><td><a href="#/city/${slug}/ward/${enc(w.key)}">${esc(wardLabel(slug, w))}</a></td><td class="num">${per[w.key] || 0}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="small"><a href="#/city/${slug}/ward/_none">${fmtN(c.unmatched)} works with no ward named in the source</a></p>
      </div>
    </div>
    <h2>All works in ${esc(c.name)}</h2>
    <div id="res"></div>`;
  document.getElementById("wq").oninput = e => {
    const t = e.target.value.toLowerCase();
    document.querySelectorAll("#wt tbody tr").forEach(r => { r.hidden = !r.dataset.n.includes(t); });
  };
  document.getElementById("ws").onchange = e => setQuery({ wsort: e.target.value === "name" ? "" : e.target.value });
  results(document.getElementById("res"), cw, {
    where: w => w.wards.map(k => wards[slug][k] ? esc(wards[slug][k].name) : "").filter(Boolean).slice(0, 3).join(", ") || "Ward not named",
  });
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
  const [meta, list, wards, geo] = await Promise.all([load("meta.json"), works(), wardLookup(), load(`wards/${slug}.geojson`)]);
  const c = meta.cities.find(x => x.slug === slug);
  if (!c) return notFound();
  const none = key === "_none";
  const w = wards[slug][key];
  if (!none && !w) return notFound();
  const ww = list.filter(x => x.city === slug && (none ? !x.wards.length : x.wards.includes(key)));
  const sum = f => ww.reduce((a, x) => a + x[f], 0);
  app.innerHTML = `
    ${crumbs([["Home", "#/"], [c.name, `#/city/${slug}`], [none ? "No ward named" : w.name]])}
    <h1>${esc(none ? `${c.name}: works with no ward named` : wardLabel(slug, w))}</h1>
    ${w && w.assembly ? `<p class="muted">Assembly constituency: ${esc(w.assembly)}</p>` : ""}
    ${stats([[fmtN(ww.length), "Road works"], [fmtN(ww.filter(x => x.flag).length), "Past finish date"],
      [inr(sum("cost")) || "—", "Sanctioned, where published"], [inr(sum("paid")) || "—", "Paid, where published"]])}
    ${none ? "" : '<div id="wardmap" class="map short"></div>'}
    ${ww.some(x => x.ward_match.startsWith("crosswalk")) ? `<p class="note">Some works were filed under an older ward map. They are listed in every current ward that overlaps the old ward, so they can also appear in a neighbouring ward.</p>` : ""}
    <h2>Works</h2>
    <div id="res"></div>`;
  results(document.getElementById("res"), ww, { sort: "recent" });
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
    ${crumbs([["Home", "#/"], [name]])}
    <h1>${esc(name)}</h1>
    ${stats([[fmtN(list.length), "Road works"], [fmtN(list.filter(w => w.flag).length), "Past finish date"],
      [fmtN(new Set(list.map(w => w.place).filter(Boolean)).size), "Towns and districts"]])}
    <div id="res"></div>`;
  results(document.getElementById("res"), list, { where: w => esc(w.place || "Place not given") });
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
    ${crumbs([["Home", "#/"], w.city ? [cityName, `#/city/${w.city}`] : [w.state, `#/state/${enc(w.state)}`], ["Work"]])}
    <h1 class="title">${esc(w.title)}</h1>
    <p>${badge(w)}</p>
    ${w.flag === "overdue" ? `<p class="note warn">The official finish date has passed and the source does not show the work as complete.</p>` : ""}
    ${w.flag === "past_estimate" ? `<p class="note warn">The source gives no finish date. Our estimate (bid opening + period of work) has passed. The work may have started later, so treat this as a question to ask, not a finding.</p>` : ""}
    <table class="fields">
      <tbody>
      ${row("Agency", esc(w.agency))}
      ${row("Office", esc(w.office))}
      ${row("Contractor", esc(w.contractor))}
      ${row("Sanctioned cost", w.sanctioned_cost ? `${inr(w.sanctioned_cost)} <span class="muted small">${esc(w.cost_basis)}</span>` : "")}
      ${row("Amount paid", inr(w.amount_paid))}
      ${row("Tender published", date(w.published_date))}
      ${row("Start or award date", date(w.start_date))}
      ${row("Period of work", w.period_days ? `${w.period_days} days` : "")}
      ${row("Finish by", w.deadline ? `${finishBy(w)}${w.deadline_basis !== "official" ? `<div class="muted small">${esc(w.deadline_basis)}</div>` : ""}` : "")}
      ${row("Status", esc(w.status))}
      ${row("Ward", wardLinks ? `${wardLinks}<div class="muted small">${how}</div>` : `<span class="np">${how}</span>`)}
      ${row("Location in source", esc(w.location_text))}
      ${row("Place", esc([w.place, w.pincode, w.state].filter(Boolean).join(", ")))}
      </tbody>
    </table>
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
    ${crumbs([["Home", "#/"], ["Past finish date"]])}
    <h1>Works past their finish date</h1>
    <p class="muted"><b>Overdue</b> means an official finish date has passed. <b>Past estimated finish</b> means the source gives only a period of work, so the date is our estimate. Sources rarely publish completion, so some of these may be done.</p>
    ${stats([[fmtN(late.filter(w => w.flag === "overdue").length), "Overdue (official date)"], [fmtN(late.filter(w => w.flag === "past_estimate").length), "Past estimated finish"]])}
    <div class="toolbar"><label class="select"><span>Where</span><select id="in">${scopes.map(([k, l]) =>
      `<option value="${esc(k)}"${k === scope ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label></div>
    <div id="res"></div>`;
  document.getElementById("in").onchange = e => setQuery({ in: e.target.value, page: "" });
  results(document.getElementById("res"), shown, { sort: "finish", where: w => esc([w.place, w.state].filter(Boolean).join(", ")) });
}

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
    <p class="lede">Public money builds our roads, drains and schools. The records exist, but they are scattered across portals, PDFs and spreadsheets. Nagarika puts them in one place, by ward, in plain language.</p>

    <h2>What we do</h2>
    <ol class="steps">
      <li><b>Make data easy to use.</b> Search by street or ward, see who is doing a work, what it costs and when it should finish, and follow the link to the official record.</li>
      <li><b>Help people collect more of it.</b> Our collectors are open source, and every gap ("not published") is a pointer to what to ask for, by RTI or from the ward office.</li>
      <li><b>Be the missing middle.</b> Where no one structures a source yet, we fetch it, clean it and publish it as open data for anyone to build on.</li>
    </ol>

    <h2>Working with others</h2>
    <p><a href="https://opencity.in">OpenCity</a> collects and publishes civic datasets, including the BBMP work orders and the ward maps used here. Nagarika builds on that: we join datasets, keep them updated and present them by ward. Our structured data is open for OpenCity and anyone else to reuse, and we credit every upstream source.</p>

    <h2>How to use it</h2>
    <ul class="uses">
      <li><b>A road outside your home is dug up.</b> Search your street. Find the agency, contractor and cost, and quote the work or tender number when you call the ward office.</li>
      <li><b>Before a ward committee or RWA meeting.</b> Open your ward page and sort by cost. Ask about the biggest works and those past their finish date.</li>
      <li><b>Filing an RTI.</b> Fields marked "Not published" are exactly what to ask for. Cite the work order or tender number from the record.</li>
      <li><b>Reporting a story.</b> Filter a city by contractor to see where one firm is working, then check each entry against its official record.</li>
      <li><b>Spotting repeat work.</b> Search a street name to see whether the same stretch was paid for more than once.</li>
      <li><b>Before an election.</b> Compare wards by spending and delays. The data is non-partisan; the questions are yours.</li>
    </ul>

    <h2>Sources</h2>
    <table class="plain"><thead><tr><th>Source</th><th class="num">Works</th><th>What it gives</th></tr></thead><tbody>${src.map(([s, n]) => {
      const [name, url, what] = SOURCE_INFO[s] || (s.startsWith("gepnic-")
        ? [`E-procurement portal (NIC): ${s.slice(7).toUpperCase()}`, "", "Active tenders of municipal, public works and highway bodies. Tender value and period of work. Contractors sit behind a captcha and are not collected yet."]
        : [s, "", ""]);
      return `<tr><td>${url ? `<a href="${url}">${esc(name)}</a>` : esc(name)}</td><td class="num">${fmtN(n)}</td><td>${esc(what)}</td></tr>`;
    }).join("")}</tbody></table>
    <p class="muted small">Ward maps: ${meta.cities.map(c => `<a href="${esc(c.ward_map_source)}">${esc(c.name)}</a>`).join(", ")} (OpenCity). Map tiles © OpenStreetMap contributors. MP local area development funds (MPLADS): see the official <a href="https://mplads.mospi.gov.in/digigov/dashboard.html">eSAKSHI dashboard</a>; a Nagarika view of these works by constituency is planned.</p>

    <h2>Method and limits</h2>
    <ul>
      <li>Only road-related works for now: roads, footpaths, drains, culverts, flyovers, and pipe or cable work that digs up a road. Other topics are listed on the home page and will follow.</li>
      <li>Wards come from the work's own text ("Ward No. 114", "K/E ward", a ward name). Older BBMP work orders use old ward numbers and are mapped to every current ward that overlaps.</li>
      <li>"Overdue" needs an official finish date. Estimated dates are always labelled.</li>
      <li>"Not published" means the source does not give it. Nothing is guessed.</li>
      <li>Updated every 6 hours. Last update ${date(meta.last_checked)}.</li>
    </ul>

    <h2>Download</h2>
    <p><a class="btn" href="data/works.csv">Download works.csv</a> <span class="muted small">${fmtN(meta.total)} rows · <a href="data/LICENSE.md">ODbL 1.0</a>: credit "Nagarika contributors" and share improvements alike.</span></p>

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
  document.querySelectorAll(".top nav a").forEach(a => {
    a.toggleAttribute("aria-current", a.getAttribute("href") === "#/" + (parts[0] || ""));
  });
  try {
    if (!parts.length) await home();
    else if (parts[0] === "search") await search();
    else if (parts[0] === "city" && parts[2] === "ward") await ward(parts[1], parts[3]);
    else if (parts[0] === "city") await city(parts[1]);
    else if (parts[0] === "state") await state(parts[1]);
    else if (parts[0] === "work") await work(parts.slice(1).join("/"));
    else if (parts[0] === "overdue") await overdue();
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
