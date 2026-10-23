# Nagarika

Open civic data for India. The first module answers one question:
**why is this road dug up?** Who is doing the work, what it costs and when it
should finish, with a link to the official record for every item.

- **Site:** https://is-this-itt.github.io/nagarika/
- **Data:** [`data/works.csv`](data/works.csv), ODbL ([data licence](data/LICENSE.md))
- **Code:** MIT ([LICENSE](LICENSE))

## What v1 covers

| Level | Where | Sources |
|---|---|---|
| Ward pages and maps | Bengaluru (369 GBA wards), Chennai (200 wards), Mumbai (24 BMC wards) | KPPP tenders, BBMP work orders, GePNIC tenders |
| Town / district | Every state whose e-procurement portal is reachable | KPPP (Karnataka), NIC GePNIC portals (central and states) |

Only road-related works are kept: roads, footpaths, drains, culverts, flyovers, and
pipe or cable work that digs up a road. See [docs/sources.md](docs/sources.md) for
each scraper and its limits.

## How it runs

```
collector/          Python collectors (one file per source in collector/sources/)
  collect.py        runs the sources, updates data/works.csv
  build.py          builds the static site into _site/
  boundaries.py     converts ward maps, builds the old-BBMP-ward crosswalk
data/works.csv      every work collected (the open dataset)
data/boundaries/    ward maps per city (GeoJSON) and the crosswalk
site/               the website (plain HTML/JS, Leaflet, OpenStreetMap tiles)
.github/workflows/update.yml   collects every 6 hours, commits data, deploys the site
```

Everything runs in GitHub Actions. To run locally:

```sh
pip install -r requirements.txt
python collector/collect.py bbmp          # or kppp, gepnic; no argument runs all
python collector/build.py
python -m http.server -d _site 8000
```

Several Indian government sites refuse connections from outside India. The
collectors report each source's result in the Actions run summary. If a source
needs an Indian connection later, run the workflow on a self-hosted runner in India.

## Principles

- Every record links to its official source and says how to find it.
- Show uncertainty; never invent data. Empty means "not published".
- "Overdue" needs an official finish date. Estimated dates are labelled as estimates.
- Non-partisan.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Adding a city or a state portal is usually a
few lines.
