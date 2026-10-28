# Nagarika MCP server

A read-only [Model Context Protocol](https://modelcontextprotocol.io) server, so anyone
can connect an AI assistant to Nagarika's data and ask about a place in plain words.
It reads only what the site already publishes (the open data files under
`_site/api/v1/` and `_site/data/`), so anything we decided not to publish stays out.

- **Transport:** Streamable HTTP, stateless, at `/mcp`. No sign-in, no keys.
- **Code:** plain JavaScript with no dependencies. `src/server.js` is a standard
  `fetch` handler (Cloudflare Workers, Deno, Node 18+); `src/tools.js` holds the tools.

## Tools

They follow the three questions in [docs/SCOPE.md](../docs/SCOPE.md), not one tool per file.

| Tool | Answers |
|---|---|
| `search_places` | Find a city, ward, town, PIN code, state or constituency; returns the tool and arguments to call next |
| `list_datasets` | What is covered, sources, freshness, known gaps, raw file addresses |
| `get_road_works` | Road works by state, town, city ward or PIN code (question 1) |
| `get_mp_funds` | MPLADS works by Lok Sabha constituency (question 1) |
| `get_mla_funds` | MLA fund works by assembly constituency (question 1) |
| `get_education_help` | RTE and scholarship portals, helplines and last dates by state (question 2) |
| `where_to_complain` | Official complaint channels by city and topic (question 3) |

Every record keeps its official source link and its `last_checked` date. The server's
instructions tell assistants to cite both, to say "not published" for empty fields,
and to stay non-partisan.

## The data files behind it

`collector/api.py` (run by `collector/build.py`) writes one small JSON file per place,
so each answer needs a file of at most about 1 MB. `api/v1/datasets.json` documents them.
Lists of works are stored as `{"fields": [...], "rows": [[...]]}`; place files keep the
newest 500 works and say how many there are in all.

## Run and test locally

```sh
python collector/build.py                      # builds _site/, including api/v1/
cd mcp && npm test                             # end-to-end tests against _site/
python -m http.server -d ../_site 8000 &
DATA_BASE=http://localhost:8000/ node local.js # http://localhost:8787/mcp
```

Try it with the MCP Inspector: `npx @modelcontextprotocol/inspector`, transport
"Streamable HTTP", URL `http://localhost:8787/mcp`.

## Deploy (Cloudflare Workers, free plan)

One-time: create a free Cloudflare account. Then, from this folder:

```sh
npx wrangler login
npx wrangler deploy
```

Wrangler prints the address, `https://nagarika-mcp.<your-subdomain>.workers.dev`. The
server is at that address plus `/mcp`. Put it in `MCP_URL` in `site/app.js` so the
"Use with your AI" guide (`#/guides/ai`) shows it.

The server caches each file for 10 minutes, and the free plan allows 100,000
requests a day. The data refreshes whenever the site does; the server needs
redeploying only when its code changes.
