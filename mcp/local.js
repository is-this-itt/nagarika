// Run the MCP server on this computer with Node 18+: node mcp/local.js
// PORT (default 8787) and DATA_BASE (default the live site; e.g. http://localhost:8000/
// after `python -m http.server -d _site 8000`) can be set in the environment.
import http from "node:http";
import server from "./src/server.js";

const port = Number(process.env.PORT || 8787);
const env = { DATA_BASE: process.env.DATA_BASE };

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(chunks);
  const r = await server.fetch(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log(`Nagarika MCP server on http://localhost:${port}/mcp`));
