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
  page is read. At most 150 new tenders per portal per run (450 for a pilot city's
  organisation). Tenders read and rejected are remembered for 120 days so later runs
  skip them; this memory is reset when the road-work filter changes
  (`FILTER_VERSION` in `common.py`). Portals with a pilot city (Tamil Nadu,
  Maharashtra) go first and get four times the time share.
- **Fields:** Tender ID, work description, organisation chain, tender value (often
  "NA"), period of work in days, location, PIN code, published and bid-opening dates.
- **Pilot cities:** Corporation of Chennai to `chennai` (wards from "Ward 114",
  "Dn114,116"); Municipal Corporation of Greater Mumbai to `mumbai` (wards from
  "K/E ward", "G/North", "RC ward", "P South ward", "L Ward", also in the office
  name). Mumbai's local works are mostly "improvement of passage and drainage"
  (the lanes between chawls and buildings), so "passage", "pathway", "drainage" and
  "divider" count as road words, and the portal's own "Civil Works - Roads" category
  is trusted. Checked on 2026-10-23 against all 353 active MCGM tenders: 142 kept,
  120 of them matched to a ward.
  K/North and P/East are newer than the 24-ward map; their works are shown in K/E
  and P/N, marked approximate.
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

## Education portals by state: `edu_portals.py`, collected from India

- **What:** for each state, the official RTE 25% admission portal and scholarship
  portals, plus the National Scholarship Portal: whether the page opened, the date we
  checked, helpline numbers shown on it, and its links about admissions and scholarships.
  The list of portals is curated in the script. Output: `data/education/portals.json`,
  shown at `#/guides/education/<state>`.
- **Last dates:** read from Karnataka SSP's "Last Dates" cards (per department, pre- and
  post-matric) and from NSP's closing-dates banner. Other portals post dates inside PDFs
  or images, so only their notice links are shown.
- **How:** many of these sites refuse visitors outside India, so this runs on the
  self-hosted runner (task `education`). Python's TLS fails on several older state
  servers; the script then retries with Windows' `curl.exe`. A portal that stops opening
  keeps what it last showed, marked with the date it last opened.

## Schools: `schools.py`, UDISE+ via the India Data Portal

- **What:** every operational school in UDISE+ "Basic Details of Schools" (Ministry of
  Education): name, UDISE code, block, village, PIN, management, classes, girls/boys
  only, location, teachers and students. The India Data Portal (ISB) republishes it at
  https://ckan.indiadataportal.com/dataset/udise under the Open Data Commons Attribution
  licence. It was retrieved in January 2022, so newer or closed schools are not reflected.
- **How:** the file is about 400 MB, so it is not in the repository. The deploy job in
  `update.yml` downloads it once into the Actions cache (key `udise-basic-<date>`; change
  the key when a newer file is published) and `build.py` writes one JSON per district to
  `_site/data/schools/`. Shown at `#/schools`.
- **Not used:** UDISE+ Know Your School and NGO Darpan's search both ask for a captcha on
  each search. We link to them instead of copying their results.

## MLALADS (MLA local area development funds): `mlalads.py`, collected from India

- **What:** works sanctioned under each state's MLA fund. Odisha so far, from the
  Planning & Convergence Department's portal (https://mlalads.odisha.gov.in), for the
  current years (2025-26 and 2026-27): about 10,900 works. One CSV per state in
  `data/mlalads/`.
- **How:** the portal answers only visitors in India, so this runs on the self-hosted
  runner (`India-only sources`, task `mlalads`; see `india-runner.md`). The landing page
  reads `GET /Masters/Ajax/GetProjectFinancialList`, which needs no login and returns
  every current project in one list. Works that drop off the list stay in the CSV with
  their last-checked date.
- **Fields:** project code, year, district, constituency, component (General / Road /
  Education), category, department, name, sanctioned and spent amounts, days allowed,
  status.
- **MLA-wise report:** `/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport` (DataTables
  parameters, `FinancialYear=2026` for 2026-27) adds the MLA's name, recommendation letter
  and date, sanction date, implementing agency, block and village. It also lists works the
  MLA recommended that are still awaiting sanction ("Pending with MLA / Collector / ZP / EA");
  those are added as works with the recommended amount.
- **Uttar Pradesh:** https://mlaladsup.in has no login on its MLA-wise report. Its pages
  POST a body of the form `{'obj':<JSON>}` to `/DropdownBinder/fillDropdown` (years, MLAs),
  `/Main/DistrictWiseWorkCounts` (`getWorkMLAWisePhysical`: works per MLA for one year) and
  `/Main/getNikayDistrictWise` (`getWorkDetails` with `seatId` and `yearId`: one MLA's works).
  Years from 2023-24. Fields are in Hindi: work ID, description, type, district, block or
  urban body, ward or gram panchayat, recommendation date, implementing agency, estimated
  cost (lakh) and physical progress %. No sanctioned or spent amounts. Status is ours: 100%
  or a completion date is Completed, other progress In Progress, none Not Started. The MLA
  list numbers each MLA by assembly constituency; `data/mlalads/up_constituencies.json`
  (number, English name, district, from Wikipedia's list of UP assembly constituencies)
  gives the English names. The portal's MLA profile has phone numbers and emails; we do not
  collect them.
- **Not yet:** Odisha's yearly totals since 1997-98 are on `/IPMS/LegacyReport`. Delhi's
  Urban Development Department lists sanction orders as PDF files
  (https://udd.delhi.gov.in/mlalad-scheme, titled by assembly constituency, order numbers
  and date). Madhya Pradesh's portal needs a login; its public dashboard link carries a
  username and password in the address, which we do not use.

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
