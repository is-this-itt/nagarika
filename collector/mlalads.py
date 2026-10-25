"""MLA local area development funds (MLALADS), from state portals that only answer
requests from India. Run by the "India-only sources" workflow on the self-hosted
runner (see docs/india-runner.md), not by the normal collection on GitHub's servers.

Odisha: mlalads.odisha.gov.in publishes every current-year project through the public
endpoint behind its landing page (/Masters/Ajax/GetProjectFinancialList): project code,
year, district, constituency, category, department, component (General / Road /
Education), sanctioned and spent amounts, time allowed and status. No login.

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
          "status", "source_url", "first_seen", "last_checked"]
ODISHA = "https://mlalads.odisha.gov.in"


def get_json(url):
    for attempt in range(3):
        try:
            r = requests.get(url, headers={"User-Agent": UA, "X-Requested-With": "XMLHttpRequest"},
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
