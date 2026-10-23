"""MPLADS works from the Ministry of Statistics' eSAKSHI portal (mplads.mospi.gov.in).

The portal's public dashboard is backed by POST endpoints that need no login:
  getStateData                     list of states
  getTilesData {uname}             summary tiles, including the current tenure
  getTilesReportData {combo, key}  one row per work for a filter
combo is "state_id,constituency_id,mp_id,house,tenure_id" (0 = all; house 2 = Lok Sabha).
For each state this adapter reads "Works Recommended", "Works Sanctioned" and
"Works Completed" and merges them by the work's recommendation id.

Output is a separate dataset, one CSV per state in data/mplads/, because MPLADS works
are chosen by MPs for any sector (schools, roads, water...), not only roads. Files are
per state so none grows past GitHub's file size limits.
"""
import csv
import glob
import json
import os
import re
import time

import requests

from common import DATA, parse_date, today

BASE = "https://mplads.mospi.gov.in/rest/PreLoginDashboardData/"
DASHBOARD = "https://mplads.mospi.gov.in/digigov/dashboard.html"
UA = "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"
CSV_DIR = os.path.join(DATA, "mplads")
OLD_CSV = os.path.join(DATA, "mplads.csv")  # single-file layout used before per-state files
HOUSE = 2  # Lok Sabha. Rajya Sabha MPs may pick any district in their state; later.
REFRESH_HOURS = 20

FIELDS = [
    "id", "work_id", "state", "constituency", "constituency_id", "mp_name", "tenure",
    "implementing_agency", "category", "activity", "description", "letter_no",
    "recommended_date", "recommended_amount", "sanction_date", "sanction_amount",
    "stage", "completed_date", "actual_amount", "source_url", "first_seen", "last_checked",
]
REPORTS = {"rec": "Works Recommended", "san": "Works Sanctioned", "com": "Works Completed"}


def post(session, path, body):
    for attempt in range(3):
        try:
            r = session.post(BASE + path, json=body, timeout=300)
            if r.status_code == 200:
                # Amounts carry a rupee sign that is not valid UTF-8; decode leniently.
                return json.loads(r.content.decode("utf-8", "replace"))
        except (requests.RequestException, ValueError):
            pass
        time.sleep(5 * (attempt + 1))
    return None


def rows_of(resp):
    if not isinstance(resp, dict) or not resp:
        return []
    v = next(iter(resp.values()))
    if isinstance(v, str):
        try:
            v = json.loads(v)
        except ValueError:
            return []
    return v if isinstance(v, list) else []


def clean_activity(v):
    """'WS/MP341/2025-2026/195605-Construction of ...' or 'NA-1.5 Construction ...' -> the activity name."""
    return re.sub(r"^(?:[A-Z]+/[^/]+/\d{4}-\d{4}/\d+|NA)-", "", (v or "").strip()).strip()


def amount(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return ""
    return str(int(round(f))) if f > 0 else ""


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def load():
    rows = {}
    for path in sorted(glob.glob(os.path.join(CSV_DIR, "*.csv"))) + ([OLD_CSV] if os.path.exists(OLD_CSV) else []):
        with open(path, newline="", encoding="utf-8") as f:
            rows.update({r["id"]: r for r in csv.DictReader(f)})
    return rows


def save(rows):
    os.makedirs(CSV_DIR, exist_ok=True)
    by_state = {}
    for r in rows.values():
        by_state.setdefault(r["state"], []).append(r)
    for state, rs in by_state.items():
        with open(os.path.join(CSV_DIR, f"{slug(state)}.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=FIELDS)
            w.writeheader()
            for r in sorted(rs, key=lambda r: (r["constituency"], r["id"])):
                w.writerow({k: r.get(k, "") for k in FIELDS})
    if os.path.exists(OLD_CSV):
        os.remove(OLD_CSV)


def run(works, state, matchers, report, budget_s):
    st = state.setdefault("mplads", {})
    last = st.get("last_run", 0)
    if time.time() - last < REFRESH_HOURS * 3600 and not os.environ.get("MPLADS_FORCE"):
        report.add("mplads", "skipped (refreshed less than a day ago)")
        return
    t0 = time.time()
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "X-Client-UA": UA, "Referer": DASHBOARD})
    states = post(s, "getStateData", {}) or []
    tiles = post(s, "getTilesData", {"uname": f"0,0,0,{HOUSE}"}) or {}
    cur = (tiles.get("Current Tenure") or [{}])[0]
    tenure_id, tenure_name = cur.get("ID"), cur.get("CAPTION", "")
    if not states or not tenure_id:
        report.add("mplads", "portal unavailable (no state list or tenure)")
        return
    old = load()
    rows, done = dict(old), 0
    for stt in states:
        if time.time() - t0 > budget_s:
            break
        sid, sname = stt["STATE_ID"], stt["STATE_NAME"].title().replace(" And ", " and ")
        combo = f"{sid},0,0,{HOUSE},{tenure_id}"
        data = {k: rows_of(post(s, "getTilesReportData", {"combo": combo, "key": key})) for k, key in REPORTS.items()}
        merged = {}
        for kind in ("rec", "san", "com"):
            for x in data[kind]:
                rid = x.get("WORK_RECOMMENDATION_DTL_ID")
                if rid is None:
                    continue
                m = merged.setdefault(rid, {})
                m.update({k: v for k, v in x.items() if v not in (None, "", "NA")})
                if kind == "com":
                    m["_completed"] = True
        for rid, x in merged.items():
            key = f"mplads:{rid}"
            prev = old.get(key, {})
            stage = "Work Completed" if x.get("_completed") else x.get("WORK_STAGE", "")
            rows[key] = {
                "id": key, "work_id": str(x.get("WORK_ID", "")), "state": sname,
                "constituency": (x.get("CONSTITUENCY") or "").title(), "constituency_id": str(x.get("CONSTITUENCY_ID", "")),
                "mp_name": (x.get("MP_NAME") or "").strip(), "tenure": x.get("TENURE") or tenure_name,
                "implementing_agency": x.get("IDA_NAME", ""), "category": x.get("WORK_CATEGORY", ""),
                "activity": clean_activity(x.get("ACTIVITY_NAME")),
                "description": (x.get("WORK_DESCRIPTION") or "").strip(), "letter_no": x.get("LETTER_NO", ""),
                "recommended_date": parse_date(x.get("RECOMMENDATION_DATE")),
                "recommended_amount": amount(x.get("RECOMMENDED_AMOUNT")),
                "sanction_date": parse_date(x.get("SANCTION_DATE")), "sanction_amount": amount(x.get("SANCTION_AMOUNT")),
                "stage": stage, "completed_date": parse_date(x.get("ACTUAL_END_DATE")),
                "actual_amount": amount(x.get("ACTUAL_AMOUNT")), "source_url": DASHBOARD,
                "first_seen": prev.get("first_seen") or today(), "last_checked": today(),
            }
        done += 1
        report.add("mplads", f"{sname}: {len(merged)} works")
        time.sleep(2)
    save(rows)
    if done == len(states):
        st["last_run"] = time.time()
    report.add("mplads", f"{done}/{len(states)} states read, {len(rows)} works in total ({tenure_name})")
