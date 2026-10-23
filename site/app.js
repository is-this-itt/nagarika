// Nagarika road works: a small hash-routed single page app over static JSON.
"use strict";

const app = document.getElementById("app");
const cache = {};
const REPO = "https://github.com/is-this-itt/nagarika";

async function load(name) {
  if (!cache[name]) cache[name] = fetch("data/" + name).then(r => {
    if (!r.ok) throw new Error(name + ": " + r.status);
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
      return o;
    }));
  }
  return cache._works;
}

// ---------- helpers ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NP = '<span class="np">not published</span>';
const enc = encodeURIComponent;

function inr(v) {
  const n = Number(v);
  if (!v || !n) return "";
  if (n >= 1e7) return "₹" + (n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: n >= 1e9 ? 0 : 2 }) + " crore";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(1) + " lakh";
  return "₹" + n.toLocaleString("en-IN");
}

function date(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const FLAG_TEXT = {
  overdue: "Overdue",
  past_estimate: "Past estimated finish",
};

function flagPill(w) {
  return w.flag ? `<span class="pill ${w.flag}">${FLAG_TEXT[w.flag]}</span>` : "";
}

function deadlineText(w) {
  if (!w.deadline) return "";
  return w.deadline_basis === "official" ? date(w.deadline) : `${date(w.deadline)} (estimate)`;
}

function workCard(w, wardName) {
  const bits = [];
  bits.push(esc(w.agency || "Agency not published"));
  bits.push(w.contractor ? "Contractor: " + esc(w.contractor) : "Contractor not published");
  if (w.sanctioned_cost) bits.push("Cost: " + inr(w.sanctioned_cost));
  if (w.amount_paid) bits.push("Paid: " + inr(w.amount_paid));
  if (w.deadline) bits.push("Finish by: " + deadlineText(w));
  if (w.status) bits.push(esc(w.status));
  const where = wardName ? wardName(w) : esc(w.place || w.state);
  return `<article class="card work ${w.flag}">
    <h3><a href="#/work/${enc(w.id)}">${esc(w.title)}</a> ${flagPill(w)}</h3>
    <div class="meta">${where ? `<span>${where}</span>` : ""}${bits.map(b => `<span>${b}</span>`).join("")}</div>
  </article>`;
}

function stats(items) {
  return `<div class="stats">${items.filter(Boolean).map(([v, l]) =>
    `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("")}</div>`;
}

function sum(list, f) { return list.reduce((a, w) => a + (Number(w[f]) || 0), 0); }

async function wardLookup() {
  const idx = await load("wards.json");
  const m = {};
  for (const [city, wards] of Object.entries(idx)) {
    m[city] = {};
    for (const [key, no, name, zone] of wards) m[city][key] = { key, no, name, zone };
  }
  return m;
}

function wardLabel(city, w) {
  if (!w) return "";
  if (city === "bengaluru") return `${w.name} (ward ${w.no}, ${w.zone.replace("Bengaluru ", "").replace(" City Corporation", "")})`;
  return w.name;
}

function cityName(meta, slug) {
  return (meta.cities.find(c => c.slug === slug) || {}).name || slug;
}

// Paginated list so big cities stay fast on phones.
function pagedList(el, list, render, step = 50) {
  let shown = 0;
  const box = document.createElement("div");
  box.className = "list";
  const more = document.createElement("button");
  more.textContent = "Show more";
  more.className = "card";
  more.onclick = () => draw();
  function draw() {
    box.insertAdjacentHTML("beforeend", list.slice(shown, shown + step).map(render).join(""));
    shown += step;
    more.hidden = shown >= list.length;
  }
  el.replaceChildren(box, more);
  if (!list.length) box.innerHTML = '<p class="muted">Nothing here yet.</p>';
  draw();
}

// ---------- maps ----------
let maps = [];
function newMap(id, opts = {}) {
  const el = document.getElementById(id);
  if (typeof L === "undefined") {  // map library blocked or offline: the rest still works
    el.innerHTML = '<p class="muted small" style="padding:12px">Map could not be loaded.</p>';
    return null;
  }
  const m = L.map(id, { scrollWheelZoom: false, ...opts });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(m);
  maps.push(m);
  return m;
}

function shade(n, max) {
  const css = getComputedStyle(document.documentElement);
  if (!n) return css.getPropertyValue("--map1");
  const r = n / Math.max(max, 1);
  return css.getPropertyValue(r > .66 ? "--map4" : r > .33 ? "--map3" : "--map2");
}

// ---------- pages ----------
async function home() {
  const meta = await load("meta.json");
  const states = Object.entries(meta.states).sort((a, b) => b[1].works - a[1].works);
  app.innerHTML = `
    <h1>Why is my road dug up?</h1>
    <p class="muted">Road works across India from official tender and work-order records: who is doing the work, what it costs and when it should finish. ${meta.total.toLocaleString("en-IN")} works so far, last checked ${date(meta.last_checked)}.</p>
    <form class="search" id="sf"><input id="q" type="search" placeholder="Area, street or ward (e.g. Jayanagar, Marina, K/E)" aria-label="Search area, street or ward" autocomplete="off"><button class="card" type="submit">Search</button></form>
    <div id="results"></div>
    <h2>Cities with ward-level detail</h2>
    <div class="grid">${meta.cities.map(c => `
      <a class="card" href="#/city/${c.slug}"><h3>${esc(c.name)}</h3>
        <div class="meta"><span>${c.works.toLocaleString("en-IN")} works</span><span>${c.wards} wards</span>${c.overdue ? `<span>${c.overdue} past finish date</span>` : ""}</div></a>`).join("")}
    </div>
    <div id="indiamap" class="map"></div>
    <h2>Everywhere else, by state</h2>
    <p class="muted small">Outside the cities above, works are shown at town or district level, as the source gives it.</p>
    <div class="grid">${states.map(([s, v]) => `<a class="card" href="#/state/${enc(s)}"><h3>${esc(s)}</h3><div class="meta"><span>${v.works.toLocaleString("en-IN")} works</span></div></a>`).join("")}</div>`;

  const m = newMap("indiamap");
  if (m) m.setView([21.5, 79], 4);
  const centres = { bengaluru: [12.97, 77.59], chennai: [13.06, 80.24], mumbai: [19.07, 72.88] };
  meta.cities.forEach(c => {
    if (!m || !centres[c.slug]) return;
    L.circleMarker(centres[c.slug], { radius: 9, weight: 2 }).addTo(m)
      .bindPopup(`<a href="#/city/${c.slug}">${esc(c.name)}</a>: ${c.works} works`);
  });

  const q = document.getElementById("q");
  const run = () => search(q.value, document.getElementById("results"));
  document.getElementById("sf").onsubmit = e => { e.preventDefault(); run(); };
  let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(run, 250); };
}

async function search(text, el) {
  const terms = text.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (!terms.length) { el.innerHTML = ""; return; }
  el.innerHTML = '<p class="muted">Searching…</p>';
  const [meta, list, wards] = await Promise.all([load("meta.json"), works(), wardLookup()]);
  const hit = s => terms.every(t => s.includes(t));
  const wardHits = [];
  for (const [city, ws] of Object.entries(wards)) {
    for (const w of Object.values(ws)) {
      if (hit(`${w.name} ward ${w.no} ${w.zone}`.toLowerCase())) wardHits.push([city, w]);
    }
  }
  const workHits = list.filter(w => hit(`${w.title} ${w.location_text} ${w.place} ${w.agency} ${w.office} ${w.contractor}`.toLowerCase()));
  el.innerHTML = `
    ${wardHits.length ? `<h2>Wards</h2><ul class="wardlist">${wardHits.slice(0, 30).map(([c, w]) =>
      `<li><a href="#/city/${c}/ward/${enc(w.key)}">${esc(wardLabel(c, w))}</a> <span class="muted small">${esc(cityName(meta, c))}</span></li>`).join("")}</ul>` : ""}
    <h2>Works mentioning “${esc(text)}” <span class="muted small">(${workHits.length})</span></h2><div id="wh"></div>`;
  pagedList(document.getElementById("wh"), workHits, w => workCard(w), 20);
}

async function city(slug) {
  const [meta, list, wards, geo] = await Promise.all([load("meta.json"), works(), wardLookup(), load(`wards/${slug}.geojson`)]);
  const c = meta.cities.find(x => x.slug === slug);
  if (!c) return notFound();
  const cw = list.filter(w => w.city === slug);
  const per = {};
  cw.forEach(w => w.wards.forEach(k => { per[k] = (per[k] || 0) + 1; }));
  const max = Math.max(0, ...Object.values(per));
  const wl = Object.values(wards[slug] || {}).sort((a, b) => a.name.localeCompare(b.name));
  app.innerHTML = `
    <p class="small"><a href="#/">India</a> › ${esc(c.name)}</p>
    <h1>Road works in ${esc(c.name)}</h1>
    ${stats([[cw.length.toLocaleString("en-IN"), "works"], [inr(c.cost) || "–", "sanctioned (where published)"],
      [inr(c.paid) || "–", "paid (where published)"], [c.overdue, "past finish date"]])}
    <p class="muted small">Ward map: ${esc(c.ward_map)} (<a href="${esc(c.ward_map_source)}">source</a>). Tap a ward.</p>
    <div id="citymap" class="map"></div>
    <div class="legend"><span><i style="background:var(--map1)"></i>no works found</span><span><i style="background:var(--map2)"></i>fewer</span><span><i style="background:var(--map4)"></i>more works</span></div>
    <h2>Wards</h2>
    <ul class="wardlist">${wl.map(w => `<li><a href="#/city/${slug}/ward/${enc(w.key)}">${esc(wardLabel(slug, w))}</a> <span class="muted small">${per[w.key] || 0}</span></li>`).join("")}</ul>
    <p><a href="#/city/${slug}/ward/_none">${c.unmatched.toLocaleString("en-IN")} works where the source does not name a ward</a></p>`;
  const m = newMap("citymap");
  if (!m) return;
  const layer = L.geoJSON(geo, {
    style: f => ({ weight: 1, color: "#555", fillOpacity: .7, fillColor: shade(per[f.properties.ward_key], max) }),
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
  const ww = list.filter(x => x.city === slug && (none ? !x.wards.length : x.wards.includes(key)))
    .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0));
  const flagged = ww.filter(x => x.flag).length;
  const title = none ? `Works in ${c.name} without a named ward` : wardLabel(slug, w);
  app.innerHTML = `
    <p class="small"><a href="#/">India</a> › <a href="#/city/${slug}">${esc(c.name)}</a> › ${esc(none ? "No ward" : w.name)}</p>
    <h1>${esc(title)}</h1>
    ${stats([[ww.length, "works"], [flagged, "past finish date"], [inr(sum(ww, "sanctioned_cost")) || "–", "sanctioned (where published)"],
      [inr(sum(ww, "amount_paid")) || "–", "paid (where published)"]])}
    ${none ? "" : '<div id="wardmap" class="map small"></div>'}
    ${ww.some(x => x.ward_match.startsWith("crosswalk")) ? `<p class="note">Some works here were filed under an older ward map. They are listed in every new ward that overlaps the old ward, so they may appear in neighbouring wards too.</p>` : ""}
    <h2>Works</h2><div id="wl"></div>`;
  pagedList(document.getElementById("wl"), ww, x => workCard(x, () => ""));
  if (!none) {
    const m = newMap("wardmap");
    if (!m) return;
    const f = geo.features.find(f => f.properties.ward_key === key);
    const layer = L.geoJSON(f, { style: { weight: 2, fillOpacity: .15 } }).addTo(m);
    m.fitBounds(layer.getBounds());
  }
}

async function state(name) {
  const list = (await works()).filter(w => (w.state || "Unknown") === name);
  const places = {};
  list.forEach(w => { const p = w.place || "Place not given"; places[p] = (places[p] || 0) + 1; });
  app.innerHTML = `
    <p class="small"><a href="#/">India</a> › ${esc(name)}</p>
    <h1>Road works in ${esc(name)}</h1>
    ${stats([[list.length, "works"], [list.filter(w => w.flag).length, "past finish date"]])}
    <form class="search" id="sf"><input id="q" type="search" placeholder="Filter by town, street or words" aria-label="Filter"></form>
    <div class="tabs" id="places">${Object.entries(places).sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([p, n]) => `<button type="button" data-p="${esc(p)}" aria-pressed="false">${esc(p)} (${n})</button>`).join("")}</div>
    <div id="wl"></div>`;
  let place = "";
  const draw = () => {
    const terms = document.getElementById("q").value.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = list.filter(w => (!place || (w.place || "Place not given") === place) &&
      terms.every(t => `${w.title} ${w.place} ${w.location_text} ${w.agency}`.toLowerCase().includes(t)));
    pagedList(document.getElementById("wl"), shown, x => workCard(x));
  };
  document.getElementById("places").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    place = place === b.dataset.p ? "" : b.dataset.p;
    document.querySelectorAll("#places button").forEach(x => x.setAttribute("aria-pressed", x.dataset.p === place));
    draw();
  };
  document.getElementById("sf").onsubmit = e => e.preventDefault();
  document.getElementById("q").oninput = draw;
  draw();
}

async function work(id) {
  const [meta, list, wards] = await Promise.all([load("meta.json"), works(), wardLookup()]);
  const w = list.find(x => x.id === id);
  if (!w) return notFound();
  const wardLinks = w.wards.map(k => w.city && wards[w.city] && wards[w.city][k]
    ? `<a href="#/city/${w.city}/ward/${enc(k)}">${esc(wardLabel(w.city, wards[w.city][k]))}</a>` : esc(k)).join(", ");
  const how = {
    text: "The ward is named in the work's title or location.",
    none: "The source does not name a ward we could recognise.",
  }[w.ward_match] || (w.ward_match.startsWith("crosswalk")
    ? `Filed under ${esc(w.ward_match.replace("crosswalk from ", "the ").replace(" (approximate)", ""))}; shown in every 2025 ward that overlaps it (approximate).` : esc(w.ward_match));
  const row = (label, val) => `<tr><th>${label}</th><td>${val || NP}</td></tr>`;
  app.innerHTML = `
    <p class="small"><a href="#/">India</a> › ${w.city ? `<a href="#/city/${w.city}">${esc(cityName(meta, w.city))}</a>` : `<a href="#/state/${enc(w.state)}">${esc(w.state)}</a>`} › Work</p>
    <h1>${esc(w.title)} ${flagPill(w)}</h1>
    ${w.flag === "overdue" ? `<p class="note">The official finish date has passed and the source does not show the work as complete.</p>` : ""}
    ${w.flag === "past_estimate" ? `<p class="note">The source does not publish a finish date. Our estimate (bid opening date plus the period of work in the tender) has passed. The real start date may have been later, so treat this as a question to ask, not a finding.</p>` : ""}
    <table class="fields">
      ${row("Agency", esc(w.agency))}
      ${row("Office", esc(w.office))}
      ${row("Contractor", esc(w.contractor))}
      ${row("Sanctioned cost", w.sanctioned_cost ? `${inr(w.sanctioned_cost)} <span class="muted small">(${esc(w.cost_basis)})</span>` : "")}
      ${row("Amount paid", inr(w.amount_paid))}
      ${row("Tender published", date(w.published_date))}
      ${row("Start / award date", date(w.start_date))}
      ${row("Period of work", w.period_days ? `${w.period_days} days` : "")}
      ${row("Finish by", w.deadline ? `${deadlineText(w)}${w.deadline_basis && w.deadline_basis !== "official" ? `<br><span class="muted small">${esc(w.deadline_basis)}</span>` : ""}` : "")}
      ${row("Status", esc(w.status))}
      ${row("Ward", wardLinks ? `${wardLinks}<br><span class="muted small">${how}</span>` : `<span class="np">${how}</span>`)}
      ${row("Location in source", esc(w.location_text))}
      ${row("Place", esc([w.place, w.pincode, w.state].filter(Boolean).join(", ")))}
      ${row("Source record", `<a href="${esc(w.source_url)}" rel="noopener">${esc(w.source_id)}</a><br><span class="muted small">${esc(w.source_note)}</span>`)}
      ${row("First seen / last checked", `${date(w.first_seen)} / ${date(w.last_checked)}`)}
    </table>
    <p class="muted small">Something wrong or missing? <a href="${REPO}/issues/new?title=${enc("Data: " + w.id)}">Report it on GitHub</a>.</p>`;
}

async function overdue() {
  const [meta, list] = await Promise.all([load("meta.json"), works()]);
  const od = list.filter(w => w.flag === "overdue");
  const pe = list.filter(w => w.flag === "past_estimate");
  const scopes = ["All", ...meta.cities.map(c => c.name), ...Object.keys(meta.states).sort()];
  app.innerHTML = `
    <h1>Works past their finish date</h1>
    <p class="muted"><b>Overdue</b>: the official deadline has passed and the source does not show the work as complete. <b>Past estimated finish</b>: the source gives only a period of work, so the finish date is our estimate from the bid opening date. Most sources do not publish completion, so a work may be done and still show here.</p>
    ${stats([[od.length, "overdue (official date)"], [pe.length, "past estimated finish"]])}
    <div class="tabs" id="scope">${scopes.map((s, i) => `<button type="button" aria-pressed="${i === 0}">${esc(s)}</button>`).join("")}</div>
    <div id="wl"></div>`;
  const draw = s => {
    const c = meta.cities.find(x => x.name === s);
    const f = w => s === "All" || (c ? w.city === c.slug : w.state === s);
    const shown = [...od, ...pe].filter(f).sort((a, b) => a.deadline.localeCompare(b.deadline));
    pagedList(document.getElementById("wl"), shown, x => workCard(x));
  };
  document.getElementById("scope").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#scope button").forEach(x => x.setAttribute("aria-pressed", x === b));
    draw(b.textContent);
  };
  draw("All");
}

const SOURCE_INFO = {
  "kppp": ["Karnataka Public Procurement Portal", "https://kppp.karnataka.gov.in", "All Karnataka works tenders, including the five Bengaluru city corporations. Gives estimated cost, status and, once awarded, the contractor. No finish date."],
  "bbmp-workorders": ["BBMP work orders and payments", "https://data.opencity.in/dataset/bbmp-work-orders-and-payments-2025-26", "From BBMP's accounts portal, republished by OpenCity. Gives contractor and amounts paid, filed by old ward number."],
};

async function about() {
  const meta = await load("meta.json");
  const src = Object.entries(meta.sources).sort((a, b) => b[1] - a[1]);
  app.innerHTML = `
    <h1>About, data and contributing</h1>
    <p>Nagarika is an open-source, non-partisan project. This first module answers one question: <b>why is this road dug up?</b> It lists road works with the agency, contractor, cost and finish date, and links each one to its official record. The data grows as a by-product of answering that question.</p>
    <h2>Sources</h2>
    <table class="fields">${src.map(([s, n]) => {
      const [name, url, what] = SOURCE_INFO[s] || (s.startsWith("gepnic-")
        ? [`Government e-procurement portal (NIC GePNIC): ${s.slice(7).toUpperCase()}`, "", "Active tenders from municipal, public works and highway organisations. Gives tender value and period of work. Contractors are behind a captcha, so they are not collected."]
        : [s, "", ""]);
      return `<tr><th>${url ? `<a href="${url}">${esc(name)}</a>` : esc(name)}</th><td>${n.toLocaleString("en-IN")} works. ${esc(what)}</td></tr>`;
    }).join("")}</table>
    <p class="small muted">Ward maps: ${meta.cities.map(c => `<a href="${esc(c.ward_map_source)}">${esc(c.ward_map)}</a>`).join("; ")} (via OpenCity). Map tiles © OpenStreetMap contributors.</p>
    <h2>Method and limits</h2>
    <ul>
      <li>Only road-related works are kept: roads, footpaths, drains, culverts, flyovers, and pipe or cable work that digs up a road. The filter uses words in the title, so it will miss some works and include a few others.</li>
      <li>Wards come from the work's own text (e.g. "Ward No. 114", "K/E ward", a ward name). Older BBMP work orders use old ward numbers and are mapped to every 2025 ward that overlaps the old one.</li>
      <li>"Overdue" needs an official finish date. Where a tender gives only a period of work, the finish date is an estimate and is labelled so.</li>
      <li>Empty fields mean the source does not publish them. Nothing is filled in by guesswork.</li>
      <li>Collected every few hours by a public GitHub Actions workflow. Last update: ${date(meta.last_checked)}.</li>
    </ul>
    <h2>Download</h2>
    <p><a href="data/works.csv">works.csv</a>: every work collected, one row per work, with source links. Licensed under the <a href="data/LICENSE.md">Open Database License (ODbL) 1.0</a>: you may use and share it, with credit to "Nagarika contributors", and must share improved versions under the same licence.</p>
    <h2>Contribute</h2>
    <p>Code is MIT-licensed at <a href="${REPO}">${REPO.replace("https://", "")}</a>. Adding a city or a state portal is usually one small file; see <a href="${REPO}/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>. Data errors: <a href="${REPO}/issues">open an issue</a>.</p>`;
}

function notFound() {
  app.innerHTML = '<h1>Not found</h1><p><a href="#/">Back to search</a></p>';
}

async function route() {
  maps.forEach(m => m.remove());
  maps = [];
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  window.scrollTo(0, 0);
  try {
    if (!parts[0]) await home();
    else if (parts[0] === "city" && parts[2] === "ward") await ward(parts[1], parts[3]);
    else if (parts[0] === "city") await city(parts[1]);
    else if (parts[0] === "state") await state(parts[1]);
    else if (parts[0] === "work") await work(parts.slice(1).join("/"));
    else if (parts[0] === "overdue") await overdue();
    else if (parts[0] === "about") await about();
    else notFound();
  } catch (e) {
    app.innerHTML = `<h1>Could not load data</h1><p class="muted">${esc(e.message)}</p>`;
  }
}

window.addEventListener("hashchange", route);
route();
