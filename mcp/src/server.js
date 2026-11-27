// Nagarika MCP server: Model Context Protocol over Streamable HTTP, stateless and read-only.
// A plain fetch handler with no dependencies, so it runs on Cloudflare Workers (the
// default, see wrangler.toml), Deno, or Node 18+ (local.js).
//
//   POST /mcp   JSON-RPC requests (single or batch); answers with application/json
//   GET  /      what this is and how to connect

import { SITE, TOOLS, callTool } from "./tools.js";

const VERSION = "1.0.0";
const PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const CACHE_MS = 10 * 60 * 1000;
const CACHE_MAX = 64;

const INSTRUCTIONS = `Nagarika is an open, non-partisan front door to Indian government information, built from official sources.
It answers three questions for a place: what is the government doing here (road works, MP and MLA local area fund works),
what is it offering and to whom (education help by state), and who is responsible and how to reach them (complaint channels).
Start with search_places when the user names a place; it returns the tool and arguments to call next. list_datasets says what is covered and what is not.
Every record links to its official source and says when it was last checked: cite both. Where a field is empty, say it is not published
(an RTI can ask for it) and never fill it in. Report facts about works, money and entitlements without judging parties or people.
Data licence: ODbL 1.0, credit "Nagarika contributors". Site: ${SITE}`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", ...CORS, ...extra },
});

// Small in-memory cache per isolate, on top of the platform's HTTP cache.
const cache = new Map();
function getter(base) {
  return async path => {
    const url = base + path;
    const hit = cache.get(url);
    if (hit && hit.at > Date.now() - CACHE_MS) return hit.value;
    const r = await fetch(url, { cf: { cacheTtl: 900, cacheEverything: true }, headers: { "User-Agent": "nagarika-mcp" } });
    if (!r.ok) throw new Error(`Could not read ${path} (HTTP ${r.status})`);
    const value = await r.json();
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(url, { at: Date.now(), value });
    return value;
  };
}

const toolList = TOOLS.map(({ run, ...t }) => ({ ...t, annotations: { title: t.title, readOnlyHint: true, idempotentHint: true, openWorldHint: false } }));

async function handle(msg, get) {
  const { id, method, params } = msg || {};
  const ok = result => ({ jsonrpc: "2.0", id, result });
  const fail = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return fail(-32600, "Invalid request");
  if (id === undefined) return null; // a notification: nothing to answer
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return ok({ protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "nagarika", title: "Nagarika civic data", version: VERSION, websiteUrl: SITE },
        instructions: INSTRUCTIONS });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: toolList });
    case "tools/call": {
      try {
        const out = await callTool(params?.name, params?.arguments, get);
        return ok({ content: [{ type: "text", text: JSON.stringify(out) }], isError: Boolean(out?.error) });
      } catch (e) {
        if (e.code) return fail(e.code, e.message);
        return ok({ content: [{ type: "text", text: `Error: ${e.message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const base = (env.DATA_BASE || SITE).replace(/\/?$/, "/");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname !== "/mcp") {
      if (request.method !== "GET") return json({ error: "Not found" }, 404);
      return json({ name: "Nagarika MCP server", version: VERSION, mcp_endpoint: `${url.origin}/mcp`, transport: "streamable-http",
        tools: TOOLS.map(t => t.name), data: base + "api/v1/datasets.json", how_to_connect: SITE + "#/guides/ai" });
    }
    // Stateless: no server-sent event stream and no sessions to end.
    if (request.method !== "POST") return json({ error: "Use POST for MCP requests." }, 405, { Allow: "POST, OPTIONS" });
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
    }
    const get = getter(base);
    const batch = Array.isArray(body);
    const answers = (await Promise.all((batch ? body : [body]).map(m => handle(m, get)))).filter(Boolean);
    if (!answers.length) return new Response(null, { status: 202, headers: CORS });
    return json(batch ? answers : answers[0]);
  },
};
