"""MLA local area development funds (MLALADS), from state portals that only answer
requests from India. Run by the "India-only sources" workflow on the self-hosted
runner (see docs/india-runner.md), not by the normal collection on GitHub's servers.

Odisha: mlalads.odisha.gov.in publishes every current-year project through the public
endpoint behind its landing page (/Masters/Ajax/GetProjectFinancialList): project code,
year, district, constituency, category, department, component (General / Road /
Education), sanctioned and spent amounts, time allowed and status. No login.
The MLA-wise report (/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport, a DataTables
endpoint, one financial year at a time) adds the MLA's name, the recommendation letter and
date, the sanction date, the implementing agency, and the block and village.

Output: one CSV per state in data/mlalads/. Amounts are in rupees.
"""
import csv
import json
import os
import sys
import time

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import DATA, today  # noqa: E402

UA = "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"
CSV_DIR = os.path.join(DATA, "mlalads")
FIELDS = ["id", "project_code", "state", "financial_year", "district", "constituency", "component",
          "category", "department", "name", "sanction_amount", "spent_amount", "days_allowed",
          "status", "mla", "recommended_amount", "letter_no", "recommended_on", "sanctioned_on", "agency", "block", "village",
          "source_url", "first_seen", "last_checked"]
REPORT_COLS = ["rowNumber", "financialYear", "districtName", "constituencyName", "fullName", "letterNo",
               "strRecommendationDate", "recommendationAmount", "projectId", "workDescription", "workStatus"]
ODISHA = "https://mlalads.odisha.gov.in"


def get_json(url, params=None):
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers={"User-Agent": UA, "X-Requested-With": "XMLHttpRequest"},
                             timeout=300, verify=False)
            if r.status_code == 200:
                return r.json()
        except (requests.RequestException, ValueError):
            pass
        time.sleep(10 * (attempt + 1))
    return None


def rupees(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return ""
    return str(int(round(f))) if f > 0 else ""


def day(v):
    """'2026-06-21T10:58:58' -> '2026-06-21'; the portal uses 0001-01-01 for 'none'."""
    v = (v or "")[:10]
    return v if v[:2] in ("19", "20") else ""


def odisha_mla(year):
    """MLA-wise recommended works for one financial year (2026 = 2026-27), by project id."""
    out, start, size = {}, 0, 5000
    while True:
        params = {"draw": 1, "start": start, "length": size, "search[value]": "", "search[regex]": "false",
                  "order[0][column]": 1, "order[0][dir]": "asc",
                  "DistrictId": 0, "FinancialYear": year, "ConstituencyId": 0, "MlaId": 0, "ExtSearch": ""}
        for i, c in enumerate(REPORT_COLS):
            params.update({f"columns[{i}][data]": c, f"columns[{i}][name]": "", f"columns[{i}][searchable]": "true",
                           f"columns[{i}][orderable]": "true", f"columns[{i}][search][value]": "",
                           f"columns[{i}][search][regex]": "false"})
        d = get_json(ODISHA + "/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport", params)
        rows = (d or {}).get("aaData") or []
        for p in rows:
            code = str(p.get("projectId") or "").strip()
            if code:
                out[code] = {
                    "_row": p,
                    "mla": " ".join((p.get("fullName") or "").split()),
                    "recommended_amount": rupees((p.get("recommendationAmount") or 0) * 100000),
                    "letter_no": " ".join((p.get("letterNo") or "").split()),
                    "recommended_on": day(p.get("recommendationDate")),
                    "sanctioned_on": day(p.get("sanctionDate")),
                    "agency": " ".join((p.get("implementionAgencyName") or "").split()),
                    "block": (p.get("blockULBName") or "").strip().title(),
                    "village": (p.get("wordVillageName") or "").strip(),
                }
        total = (d or {}).get("iTotalDisplayRecords") or 0
        start += size
        if not rows or start >= total:
            return out


def odisha():
    data = get_json(ODISHA + "/Masters/Ajax/GetProjectFinancialList")
    if not isinstance(data, list) or not data:
        return None
    out = []
    for p in data:
        code = str(p.get("projectId") or "").strip()
        if not code:
            continue
        out.append({
            "id": f"od:{code}", "project_code": code, "state": "Odisha",
            "financial_year": p.get("financialYear") or "",
            "district": (p.get("districtName") or "").strip().title(),
            "constituency": (p.get("constituencyName") or "").strip().title(),
            "component": p.get("component") or "", "category": (p.get("category") or "").strip(),
            "department": (p.get("department") or "").strip().title(),
            "name": " ".join((p.get("projectName") or "").split()),
            "sanction_amount": rupees(p.get("sanctionAmount")), "spent_amount": rupees(p.get("expenditureAmount")),
            "days_allowed": str(p.get("completionDays") or ""), "status": p.get("status") or "",
            "source_url": ODISHA + "/IPMS/Report",
        })
    years = sorted({int(r["financial_year"][:4]) for r in out if r["financial_year"][:4].isdigit()})
    extra = {}
    for y in years:
        got = odisha_mla(y)
        print(f"odisha: MLA report {y}: {len(got)} works")
        extra.update(got)
    have = set()
    for r in out:
        x = extra.get(r["project_code"])
        if x:
            r.update({k: v for k, v in x.items() if k != "_row"})
            have.add(r["project_code"])
    # Works the MLA recommended that the project list doesn't carry yet (mostly awaiting
    # sanction, e.g. "Pending with ZP").
    for code, x in extra.items():
        if code in have:
            continue
        p = x["_row"]
        out.append({
            "id": f"od:{code}", "project_code": code, "state": "Odisha",
            "financial_year": p.get("financialYear") or "",
            "district": (p.get("districtName") or "").strip().title(),
            "constituency": (p.get("constituencyName") or "").strip().title(),
            "component": "", "category": (p.get("workCategory") or "").strip(), "department": "",
            "name": " ".join((p.get("workDescription") or "").split()),
            "sanction_amount": rupees(p.get("sanctionAmount")), "spent_amount": "", "days_allowed": "",
            "status": p.get("workStatus") or "", "source_url": ODISHA + "/IPMS/Report",
            **{k: v for k, v in x.items() if k != "_row"},
        })
    return out


def save(state_slug, rows):
    path = os.path.join(CSV_DIR, f"{state_slug}.csv")
    old = {}
    if os.path.exists(path):
        old = {r["id"]: r for r in csv.DictReader(open(path, newline="", encoding="utf-8"))}
    t = today()
    for r in rows:
        r["first_seen"] = old.get(r["id"], {}).get("first_seen") or t
        r["last_checked"] = t
    seen = {r["id"] for r in rows}
    # Keep projects that dropped off the portal's current list (e.g. after the year turns),
    # with their last known values and last_checked date.
    rows += [r for i, r in old.items() if i not in seen]
    rows.sort(key=lambda r: (r["constituency"], r["project_code"]))
    os.makedirs(CSV_DIR, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def main():
    import urllib3
    urllib3.disable_warnings()
    ok = True
    rows = odisha()
    if rows is None:
        print("odisha: no data (portal down or not reachable from here)")
        ok = False
    else:
        print(f"odisha: {len(rows)} projects fetched, {save('odisha', rows)} kept")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
