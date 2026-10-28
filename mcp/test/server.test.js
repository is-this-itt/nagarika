// End-to-end tests against a locally built site: run `python collector/build.py` first.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import server from "../src/server.js";

const SITE_DIR = path.resolve(import.meta.dirname, "../../_site");
let files, env;

before(async () => {
  assert.ok(fs.existsSync(path.join(SITE_DIR, "api/v1/datasets.json")), "build the site first: python collector/build.py");
  files = http.createServer((req, res) => {
    const p = path.join(SITE_DIR, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(SITE_DIR) || !fs.existsSync(p)) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "application/json" }).end(fs.readFileSync(p));
  });
  await new Promise(r => files.listen(0, r));
  env = { DATA_BASE: `http://localhost:${files.address().port}/` };
});
after(() => files.close());

let n = 0;
async function rpc(method, params) {
  const r = await server.fetch(new Request("http://mcp.test/mcp", { method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }) }), env);
  assert.equal(r.status, 200);
  return (await r.json()).result;
}
async function call(name, args = {}) {
  const res = await rpc("tools/call", { name, arguments: args });
  return { ...JSON.parse(res.content[0].text), _isError: res.isError };
}

test("initialize and list tools", async () => {
  const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } });
  assert.equal(init.protocolVersion, "2025-06-18");
  assert.equal(init.serverInfo.name, "nagarika");
  const { tools } = await rpc("tools/list");
  assert.deepEqual(tools.map(t => t.name), ["search_places", "list_datasets", "get_road_works", "get_mp_funds",
    "get_mla_funds", "get_education_help", "where_to_complain"]);
  assert.ok(tools.every(t => t.annotations.readOnlyHint && t.inputSchema.type === "object"));
});

test("notifications get 202 and no body", async () => {
  const r = await server.fetch(new Request("http://mcp.test/mcp", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }), env);
  assert.equal(r.status, 202);
});

test("GET /mcp is refused, GET / describes the server", async () => {
  assert.equal((await server.fetch(new Request("http://mcp.test/mcp"), env)).status, 405);
  const info = await (await server.fetch(new Request("http://mcp.test/"), env)).json();
  assert.equal(info.mcp_endpoint, "http://mcp.test/mcp");
});

test("search_places finds a ward and says which tool to call", async () => {
  const r = await call("search_places", { query: "aerocity" });
  const w = r.matches.find(m => m.kind === "Ward");
  assert.ok(w, JSON.stringify(r).slice(0, 300));
  assert.equal(w.tool, "get_road_works");
  const works = await call("get_road_works", w.args);
  assert.equal(works.city, "Bengaluru");
  assert.ok(works.works.every(x => x.link.startsWith("https://is-this-itt.github.io/nagarika/#/work/")));
});

test("road works by state and place, with filters", async () => {
  const st = await call("get_road_works", { state: "Karnataka" });
  assert.ok(st.works.length > 0 && st.places.length > 0);
  const p = await call("get_road_works", { state: "karnataka", place: st.places[0].slug, limit: 5 });
  assert.ok(p.shown <= 5 && p.works[0].source_url !== undefined);
  const bad = await call("get_road_works", { state: "Atlantis" });
  assert.ok(bad._isError && bad.options.length);
});

test("MP funds: national, state, constituency without state", async () => {
  const all = await call("get_mp_funds");
  assert.ok(all.states.length > 30);
  const c = await call("get_mp_funds", { constituency: "Varanasi", limit: 3 });
  assert.equal(c.state, "Uttar Pradesh");
  assert.ok(c.totals.works >= c.works.length && c.works.length <= 3);
  assert.ok(c.works[0].link.includes("#/mpwork/uttar-pradesh/"));
});

test("MLA funds: Odisha constituency", async () => {
  const s = await call("get_mla_funds", { state: "Odisha" });
  const name = s.constituencies[0].name;
  const c = await call("get_mla_funds", { constituency: name, status: "not started", limit: 5 });
  assert.equal(c.state, "Odisha");
  assert.ok(c.works.every(w => w.status === "Not Started"));
});

test("education help and complaint channels", async () => {
  const e = await call("get_education_help", { state: "Karnataka" });
  assert.ok(e.portals.length && e.national.length);
  const ch = await call("where_to_complain", { city: "bengaluru", topic: "roads" });
  assert.ok(ch.channels.some(c => c.name.startsWith("GBA")) && ch.channels.some(c => c.name === "CPGRAMS"));
  assert.ok(ch.channels.find(c => c.name === "RTI").link.startsWith("https://"));
  const mla = await call("where_to_complain", { topic: "mla_funds", state: "Odisha" });
  assert.ok(mla.channels.some(c => c.for === "mla_odisha"));
});

test("list_datasets and unknown tools", async () => {
  const d = await call("list_datasets");
  assert.ok(d.datasets.find(x => x.id === "road_works").coverage.works > 0);
  const r = await server.fetch(new Request("http://mcp.test/mcp", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "nope" } }) }), env);
  assert.equal((await r.json()).error.code, -32602);
});

test("PIN code from search_places returns its works", async () => {
  const s = await call("search_places", { query: "560001", kind: "PIN code" });
  const r = await call("get_road_works", s.matches[0].args);
  assert.ok(r.matching > 0 && r.works.every(w => w.pincode === "560001"));
  assert.ok((await call("get_road_works", { pincode: "999999" }))._isError);
});
