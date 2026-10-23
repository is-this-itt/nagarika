"""Karnataka Public Procurement Portal (kppp.karnataka.gov.in).

The portal's public tender view is backed by an open JSON endpoint that takes a
numeric tender id. Ids are shared by goods, works and services tenders, so this
adapter walks the id range and keeps the works tenders that are road-related.

Each run:
  1. scans forward from the newest id seen, until a long run of misses;
  2. scans one chunk backwards (history backfill) until KPPP_FLOOR is reached;
  3. re-checks open records so status and contractor stay current.
"""
import datetime as dt
import os
import time
from concurrent.futures import ThreadPoolExecutor

import requests

from common import add_days, is_road_work, money, parse_date, today, upsert

API = "https://kppp.karnataka.gov.in/supplier-registration-service/v1/api/portal-service/{}/works-tender-full-view"
HEADERS = {
    "User-Agent": "nagarika civic data (+https://github.com/is-this-itt/nagarika)",
    "Referer": "https://kppp.karnataka.gov.in/",
    "Post": "CONTRACTOR-EPROC-CONTRACTOR",  # the portal's own front end sends this
}
FLOOR = int(os.environ.get("KPPP_FLOOR", "230000"))        # ~Sept 2025, when the GBA corporations began
BACKFILL = int(os.environ.get("KPPP_BACKFILL", "6000"))    # ids per run
RECHECK = int(os.environ.get("KPPP_RECHECK", "1500"))      # open records re-fetched per run
WORKERS = 4
FINAL = {"Awarded", "Cancelled", "Recalled", "Retendered", "No Bids Recieved", "No Bids Received"}

# Departments whose works fall inside Bengaluru's corporation limits.
BENGALURU_DEPTS = {
    "Bengaluru Central City Corporation", "Bengaluru East City Corporation",
    "Bengaluru North City Corporation", "Bengaluru South City Corporation",
    "Bengaluru West City Corporation", "Greater Bengaluru Authority",
    "Bruhat Bengaluru Mahanagara Palike", "Bengaluru Smart Infrastructure Limited",
}


def fetch(session, tid):
    for attempt in range(3):
        try:
            r = session.get(API.format(tid), timeout=60)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (400, 404, 500):
                return None
        except (requests.RequestException, ValueError):
            pass
        time.sleep(2 * (attempt + 1))
    return None


def to_record(tid, d, matchers):
    ts = d.get("tenderSchedule") or {}
    nit = d.get("noticeInvitingTenderDTO") or {}
    locs = d.get("tenderWorkLocationList") or []
    addr = d.get("tenderAddress") or {}
    title = ts.get("title") or ""
    desc = ts.get("description") or ""
    loc_text = "; ".join(x.get("locationDescription") or "" for x in locs if x.get("locationDescription"))
    if not is_road_work(title, desc, loc_text):
        return None
    dept = (ts.get("deptName") or "").strip()
    city = "bengaluru" if dept in BENGALURU_DEPTS else ""
    district = next((x.get("districtName") for x in locs if x.get("districtName")), "") or ""
    place = district or (addr.get("city") or "").title()
    award = d.get("tenderAwardDatesDTO") or {}
    winners = award.get("listOfBidderDonePBGDTO") or []
    awarded = award.get("awardedDates")
    start = dt.datetime.fromtimestamp(awarded / 1000).date().isoformat() if awarded else ""
    wards, how = [], "none"
    if city and city in matchers:
        wards = matchers[city].match(" ".join([title, desc, loc_text, ts.get("locationName") or ""]))
        how = "text" if wards else "none"
    return {
        "id": f"kppp:{tid}", "source": "kppp", "source_id": ts.get("tenderNumber") or str(tid),
        "source_url": API.format(tid),
        "source_note": f"Official KPPP record (JSON). On kppp.karnataka.gov.in, search tender number {ts.get('tenderNumber', '')}.",
        "title": title or desc, "agency": dept, "office": ts.get("locationName") or "",
        "contractor": "; ".join(w.get("name", "") for w in winners if w.get("name")),
        "state": "Karnataka", "state_lgd": "29", "city": city, "place": place,
        "pincode": addr.get("pin") or "", "ward_ids": ";".join(wards), "ward_match": how,
        "location_text": "; ".join(x for x in [loc_text, ts.get("locationName") or ""] if x),
        "sanctioned_cost": money(ts.get("ecv")), "cost_basis": "Estimated contract value in the tender",
        "published_date": parse_date(nit.get("publishedDate")), "start_date": start,
        "period_days": "", "deadline": "", "deadline_basis": "",
        "status": ts.get("statusText") or ts.get("status") or "",
    }


def run(works, state, matchers, report, budget_s):
    t0 = time.time()
    s = requests.Session()
    s.headers.update(HEADERS)
    st = state.setdefault("kppp", {})
    hi = st.get("next_id") or 336000
    lo = st.get("backfill_low") or hi
    kept = scanned = 0

    def process(ids):
        nonlocal kept, scanned
        with ThreadPoolExecutor(WORKERS) as ex:
            results = list(ex.map(lambda i: (i, fetch(s, i)), ids))
        hits = 0
        for tid, d in results:
            scanned += 1
            if d:
                hits += 1
                rec = to_record(tid, d, matchers)
                if rec:
                    upsert(works, rec)
                    kept += 1
        return results

    # 1. Forward scan for new tenders.
    misses, cur = 0, hi
    while misses < 400 and time.time() - t0 < budget_s * 0.4:
        res = process(range(cur, cur + 100))
        for tid, d in res:
            misses = 0 if d else misses + 1
            if d:
                hi = max(hi, tid + 1)
        cur += 100
    st["next_id"] = hi

    # 2. Backfill one chunk of history.
    target = max(FLOOR, lo - BACKFILL)
    while lo > target and time.time() - t0 < budget_s * 0.8:
        start = max(target, lo - 200)
        process(range(start, lo))
        lo = start
    st["backfill_low"] = lo

    # 3. Re-check records that may still change (oldest check first).
    open_recs = sorted((r for r in works.values() if r["source"] == "kppp" and r["status"] not in FINAL
                        and r["last_checked"] < today()), key=lambda r: r["last_checked"])[:RECHECK]
    rechecked = 0
    for chunk in range(0, len(open_recs), 100):
        if time.time() - t0 > budget_s:
            break
        ids = [int(r["id"].split(":")[1]) for r in open_recs[chunk:chunk + 100]]
        process(ids)
        rechecked += len(ids)

    report.add("kppp", f"scanned {scanned} ids, kept {kept} road works; newest id {hi - 1}; "
                       f"history scanned down to id {lo} (floor {FLOOR}); re-checked {rechecked}")
