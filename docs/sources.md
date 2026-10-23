# Sources and scrapers

Each adapter lives in `collector/sources/` and writes rows in the common format
defined in `collector/common.py` (`FIELDS`).

## Karnataka Public Procurement Portal: `kppp.py`

- **What:** all works tenders on https://kppp.karnataka.gov.in, statewide.
- **How:** the portal's public tender view is backed by an open JSON endpoint,
  `/supplier-registration-service/v1/api/portal-service/<id>/works-tender-full-view`
  (no login, no captcha). Ids are numeric and shared by goods, works and services
  tenders. Each run scans forward for new ids, scans one chunk of history backwards
  (down to `KPPP_FLOOR`, about September 2025), and re-checks records not yet in a
  final state.
- **Fields:** tender number, title, department, office, estimated contract value,
  status, published date, work location text, district, PIN code. Once a tender is
  awarded: award date and the bidder who furnished the performance guarantee (the
  contractor).
- **Bengaluru:** works by the five city corporations, GBA, BBMP and B-SMILE are
  tagged `bengaluru`; wards are matched by ward name in the title or location text.
- **Missing:** no finish date or period of work in this view, so KPPP works are never
  flagged overdue.
- **Source link:** the official JSON record. On the portal, search by tender number.

## NIC GePNIC portals: `gepnic.py`

- **What:** the central portal (eprocure.gov.in) and state portals that run NIC's
  GePNIC software (`.../nicgep/app`). Tamil Nadu, Maharashtra and Delhi were confirmed
  reachable from GitHub runners on 2026-10-23; the rest are tried every run and the
  result is in the run summary.
- **How:** "Tenders by Organisation" (no captcha) lists active tenders per
  organisation. Organisations whose names suggest road building (municipal bodies,
  PWD, highways, development authorities) are opened, and each new tender's detail
  page is read. At most 150 new tenders per portal per run.
- **Fields:** Tender ID, work description, organisation chain, tender value (often
  "NA"), period of work in days, location, PIN code, published and bid-opening dates.
- **Pilot cities:** Corporation of Chennai to `chennai` (wards from "Ward 114",
  "Dn114,116"); Municipal Corporation of Greater Mumbai to `mumbai` (wards from
  "K/E ward", "L Ward").
- **Missing:** award results (contractor, contract value) are behind a captcha and
  are not collected. Tender detail links are session-bound, so the record gives the
  Tender ID to search for.
- **Finish date:** estimated as bid opening date + period of work, labelled
  "estimated". The site calls these "past estimated finish", never "overdue".

## BBMP work orders and payments: `bbmp_workorders.py`

- **What:** BBMP bill payments from its accounts portal (accounts.bbmp.gov.in),
  republished by OpenCity as CSV (public domain), for 2024-25 and 2025-26.
- **How:** read via OpenCity's CKAN API; rows grouped by work order number.
- **Fields:** work order number, title, ward (old numbering), contractor, gross amount
  paid, payment dates.
- **Wards:** BBMP files works under the ward map in force when sanctioned (198, 243
  or 225 wards; 300+ are multi-ward). `boundaries.py` builds a crosswalk to the 2025
  GBA wards by area overlap; a work is listed in every new ward covering at least 20%
  of its old ward, and marked approximate.
- **Missing:** sanctioned cost, start date and deadline.
- **Removed:** contractor phone numbers.

## Ward maps: `boundaries.py`

From OpenCity (public domain): GBA 2025 (369 wards), BBMP 2015/2022/2023 (for the
crosswalk), Greater Chennai Corporation 2022 (200 wards), BMC administrative wards
(24). Converted from KML, simplified to about 5 m, and stored in `data/boundaries/`.

## Not reachable from GitHub runners (2026-10-23)

GeM, data.gov.in, PMGSY (omms.nic.in), bbmp.gov.in, accounts.bbmp.gov.in,
gba.karnataka.gov.in. These need a collector running from an Indian network.

## MPLADS (MP local area development funds): `mplads.py`

- **What:** works recommended, sanctioned and completed under MPLADS, from the
  Ministry of Statistics' eSAKSHI portal (https://mplads.mospi.gov.in), for the
  current Lok Sabha, all states. Saved separately, one CSV per state in
  `data/mplads/`, because MPs fund every sector, not only roads (per-state files keep
  each one well under GitHub's file size limits). The site also offers one combined
  `mplads.csv` download, built at deploy time.
- **How:** the portal's public dashboard calls POST endpoints under
  `/rest/PreLoginDashboardData/` that need no login: `getStateData`, `getTilesData`
  (gives the current tenure) and `getTilesReportData` with
  `{"combo": "<state>,<constituency>,<mp>,<house>,<tenure>", "key": "Works Recommended"}`
  (also "Works Sanctioned", "Works Completed"; 0 means all, house 2 = Lok Sabha).
  The three lists are merged by the work's recommendation id. Runs at most once a day.
- **Fields:** MP, constituency, implementing district authority, work type and
  category, description (often naming the ward and locality), recommendation letter
  number, recommended and sanctioned amounts and dates, stage, completion date and
  amount spent.
- **Not yet:** Rajya Sabha MPs (they may pick any district in their state), earlier
  Lok Sabhas, and attachments (photos, completion certificates).
- **Linking to wards:** Bengaluru wards carry their assembly constituency; a fixed
  table (`BENGALURU_AC_TO_PC` in `places.py`, 2008 delimitation) maps it to the Lok
  Sabha constituency, so a ward page links to its MP's works and lists those whose
  description names the ward.
- **Source link:** the eSAKSHI dashboard has no per-work URL; the record gives the
  state, constituency and letter number to find it. The site's MPLADS guide
  (`#/guides/mplads`) walks citizens through the portal itself.
- **One-year rule:** the portal's own notice says sanctioned works are "generally
  required to be completed within one year of sanction". The site flags works
  sanctioned over a year ago and not marked complete as "Over a year since sanction".
