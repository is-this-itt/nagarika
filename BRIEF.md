# Nagarika road works: brief

Original working name: road-works-tracker. Project name: **Nagarika** (city-neutral;
road works is its first module).

Name: road-works-tracker

Goal: An open-source public website showing residents anywhere in India why a road
near them is dug up: who is doing the work, what it costs, and when it should finish.
First module of a larger open civic-data project.

> Scope change (2026-10-23, owner): India-wide, not Bengaluru-only. The original
> Bengaluru-specific wording below is kept as the starting brief; the "Decisions made"
> section records how it now applies across India.

## Must-have features (v1)
1. Ingest public road/public-works tenders and work orders for Bengaluru from official
   sources, keeping a link to the source record for every item
2. Map each work to its ward (new GBA city corporation wards)
3. Ward page: list of works with agency, contractor, sanctioned cost, start date,
   deadline, status
4. Search by area, street or ward name
5. Flag works past their deadline as "overdue"
6. Open data: downloadable CSV of everything collected
7. Public GitHub repo with documented scrapers and a contributing guide

## Later (not v1)
- Citizen photo reports and corroboration of on-ground status
- RTI drafting helper for works with missing data
- Other agencies (BWSSB, BESCOM) and other topics (garbage, streetlights, MLA funds)
- Ward/candidate report cards ahead of the GBA corporation elections
- Mapping wards to MLA, MP and responsible engineers
- Kannada UI, other cities, alerts for a saved area

## Screens / flow
1. Home: search box (area/street/ward) plus a city map of wards
2. Ward page: works list, overdue ones highlighted, totals spent
3. Work detail: all fields, source link, last-updated date
4. Overdue list: all past-deadline works across the city
5. About / Data / Contribute: sources, method, CSV download, repo link

## Data
Shared, public. Works records and ward boundaries. No user accounts in v1.

## Integrations
Karnataka e-procurement portal; GBA / city corporation works data; ward boundary GIS
files (e.g. OpenCity); OpenStreetMap for map tiles.

## Decisions made
- Open source from day one
- Build a service that answers one question; the data repository grows as a
  byproduct (no "collect everything" upfront)
- Start with Bengaluru road works only
- English first
- Every record links to its official source; show uncertainty, don't invent data
- Non-partisan
- India-wide from the start (owner, 2026-10-23). The name, schema and code must not be
  tied to one city or state. Each state/city is a pluggable "source adapter" writing to
  one common schema. Locations use the official LGD (Local Government Directory) codes
  for state, district, local body and ward, so places are named the same way India-wide.
- Location precision varies by place and is shown honestly: ward level where a ward map
  exists (e.g. Datameet/OpenCity files), otherwise city/local-body or district level.
- Sources India-wide: government e-procurement portals. The central portal (CPPP) and
  most states run NIC's GePNIC software, so one adapter can cover many states; states
  with their own portal (e.g. Karnataka KPPP) get their own adapter. Work-order and
  payment data is published only by some cities and is added city by city.
- Reachability from GitHub Actions (tested 2026-10-23): OK for CPPP, Maharashtra, Tamil
  Nadu and Delhi GePNIC portals, Karnataka KPPP, LGD, OpenCity, Datameet. Failed for GeM,
  data.gov.in, PMGSY (omms.nic.in) and the BBMP/GBA sites. If those are needed, run the
  collector on a self-hosted runner in India (e.g. free Oracle Cloud VM, Mumbai).
- v1 scope (owner chose option A, 2026-10-23): the collector covers every state portal
  it can reach, at town/district level. Ward-level pages start in three pilot cities
  chosen by the session for open data quality: Bengaluru (KPPP tenders + BBMP work
  orders + GBA 2025 ward map), Chennai (Corporation of Chennai tenders + 200-ward map),
  Mumbai (MCGM tenders + 24 admin wards).
- Deadlines: KPPP and BBMP data publish no finish date. GePNIC tenders give a period
  of work, so the finish date is estimated as bid opening date + period and labelled
  "past estimated finish", never "overdue". "Overdue" is kept for official dates.
- Contractors: GePNIC award results sit behind a captcha and are not collected in v1.
- Hosting: GitHub Pages from the nagarika repo; collection runs every 6 hours in
  GitHub Actions and commits data/works.csv.
- Bengaluru data decision (2026-10-23): merge both sources. BBMP/GBA work-order and payment CSVs
  (via OpenCity, from accounts.bbmp.gov.in) are the base: ward, contractor, amount paid.
  Karnataka e-procurement (KPPP) tenders add sanctioned cost and deadline where a tender
  can be matched. Fields with no source show "not published"; "overdue" applies only
  where a deadline is known.
- Standalone project. No tie-in with ForThePeople.in or other projects.
- Licence: MIT for code, ODbL for data.
- Name: Nagarika. Code and data live in the public repo is-this-itt/nagarika.
- Tech (session's call): Python collectors run on a schedule in GitHub Actions and
  commit CSV to the repo; a static site (plain HTML/JS, Leaflet + OSM tiles) is built
  from that data. Hosting on GitHub Pages, so no Cloudflare secrets need copying. Reason: no server or database is needed for read-only public data, and
  the data history lives in git.
- Ward boundaries: GBA 2025 delimitation, 369 wards / 5 corporations (OpenCity KML).
  Older work orders use 198/243/225-ward numbering, so they are matched to new wards
  through a spatial crosswalk, flagged as approximate.

- Mission (owner, 2026-10-23): (1) help citizens collect more civic data, (2) make it as
  easy as possible to use, (3) act as middleware: fetch and structure sources no one is
  structuring yet. Nagarika is a catalyst, not a competitor, for data collectors such as
  OpenCity: we build on their datasets, credit them, and give our structured data back.
- Sectors (owner, 2026-10-23): the site lists all planned topics (water, streetlights,
  buildings, parks, garbage, MP/MLA funds) as "coming soon"; only roads has data. Roads
  came first because it answers one concrete question with sources that are reachable.
- MPLADS (owner asked to link it): eSAKSHI (mplads.mospi.gov.in) is reachable from
  GitHub runners; its dashboard is a ZK web app with no documented API. v1 links to it;
  ingesting works by constituency is the next candidate module.
- UI (owner, 2026-10-23): standard components: results table with numbered pagination,
  sort and filter chips kept in the URL, stacked rows on phones; search results page.

- Hierarchy (owner, 2026-10-23): topic first, then place. Home = search + "use my
  location" + topics as top-level cards (live: Road works, MP funds; others "coming
  soon"). Inside a topic: state > city or Lok Sabha constituency > ward. Place pages
  link across topics (a Bengaluru ward page links to its MP's MPLADS works).
- Search (owner: people don't know exact names): suggestions as you type over a
  place index (wards, assembly and Lok Sabha constituencies, MPs, towns, PIN codes);
  typo-tolerant word matching with a sound-alike fallback for Indian spelling
  variants (Koramangala/Kormangala, Bangalore/Bengaluru); numbers match exactly;
  geolocation finds the ward. Written in-house (no search library) so behaviour is
  predictable and nothing extra loads.
- MPLADS module (owner, 2026-10-23): eSAKSHI public dashboard endpoints, current
  Lok Sabha, all states, daily; separate dataset data/mplads.csv. Rajya Sabha and
  earlier tenures later.

- Owner, 2026-10-23: light mode only for now. Every field on detail pages carries a
  plain-language explanation. A Guides section teaches citizens to use the official
  portals themselves (first: MPLADS eSAKSHI), as one of the project's aims is to spread
  the resources to reach data at its source.
- MPLADS data stored one CSV per state (data/mplads/) to stay under GitHub's 100 MB
  file limit; works sanctioned over a year ago and not complete are flagged, per the
  portal's own one-year guideline.

- Logo (owner chose round 2, option 5, 2026-10-23): "citizens together": a white map
  pin with a citizen, flanked by two fainter pins, on the site's blue (#1d5a91).
  Files: site/logo.svg (source), site/apple-touch-icon.png, site/logo-512.png; all
  concepts from both rounds are in docs/brand/.

- Mumbai coverage (2026-10-23): only 5 works were showing out of 353 active MCGM
  tenders. Causes: the tender collector re-read rejected tenders every run and ran
  out of time; Mumbai's vocabulary ("passage and drainage", "pathway", "divider")
  and ward spellings ("RC ward", "P South ward") were not recognised. Fixed: rejected
  tenders are remembered, pilot portals get more time, filter and ward matching
  widened (142 of 353 kept in a test, 120 with a ward).

## Open questions
- Which unconfirmed state GePNIC portals are reachable from GitHub runners (the run
  summary reports each one)
- Sources for official finish dates and completion status (RTI, city dashboards)

