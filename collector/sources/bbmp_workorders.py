"""BBMP work orders and payments, from BBMP's accounts portal as republished by
OpenCity (data.opencity.in, public domain).

Each CSV row is one bill payment. Rows are grouped by work order. BBMP files them
under the ward numbering in force when the work was sanctioned (198, 243 or 225
wards; codes 300+ are multi-ward "common" works), so wards are carried over to
the 2025 GBA wards with an area crosswalk and marked approximate.
"""
import csv
import io
import json
import os
import re

import requests

from common import DATA, is_road_work, parse_date, upsert

DATASETS = ["bbmp-work-orders-and-payments-2025-26", "bbmp-work-orders-and-payments-2024-25"]
CKAN = "https://data.opencity.in/api/3/action/package_show?id={}"
UA = {"User-Agent": "nagarika civic data (+https://github.com/is-this-itt/nagarika)"}


def regime_of(resource_name):
    m = re.search(r"(198|243|225)", resource_name)
    return m.group(1) if m else "common"


def clean_contractor(s):
    s = re.sub(r"^\s*\d+\s+", "", s or "")       # leading contractor code
    s = re.sub(r"\s*\+?\d[\d\s-]{8,}\d\s*$", "", s)  # trailing phone number (not published here)
    return s.strip()


def run(works, state, matchers, report, budget_s):
    cross = json.load(open(os.path.join(DATA, "boundaries", "bbmp_crosswalk.json")))
    groups = {}
    for ds in DATASETS:
        try:
            meta = requests.get(CKAN.format(ds), headers=UA, timeout=60).json()["result"]
        except (requests.RequestException, ValueError, KeyError) as e:
            report.add("bbmp-workorders", f"{ds}: dataset unavailable ({type(e).__name__})")
            continue
        for res in meta["resources"]:
            if res.get("format", "").upper() != "CSV":
                continue
            regime = regime_of(res["name"])
            text = requests.get(res["url"], headers=UA, timeout=180).content.decode("utf-8", "replace")
            for row in csv.DictReader(io.StringIO(text)):
                wo, _, title = (row.get("wodetails") or "").partition("</a>")
                wo = wo.strip()
                if not wo:
                    continue
                g = groups.setdefault(wo, {"title": title.strip(), "ward": (row.get("ward") or "").strip(),
                                           "regime": regime, "contractor": clean_contractor(row.get("contractor")),
                                           "paid": 0, "bills": [], "dataset": ds, "bbmp_id": row.get("id", "")})
                try:
                    g["paid"] += int(float(row.get("amount") or 0))
                except ValueError:
                    pass
                g["bills"].append(row.get("brnumber") or "")
    kept = 0
    for wo, g in groups.items():
        if not is_road_work(g["title"]):
            continue
        wards, how = [], "none"
        if g["regime"] != "common" and g["ward"].isdigit():
            hit = cross.get(g["regime"], {}).get(str(int(g["ward"])))
            if hit:
                wards = [h["ward_key"] for h in hit]
                how = f"crosswalk from old {g['regime']}-ward map, ward {int(g['ward'])} (approximate)"
        if not wards and "bengaluru" in matchers:
            wards = matchers["bengaluru"].match(g["title"])
            how = "text" if wards else how
        paid_dates = sorted(d for d in (parse_date(m) for b in g["bills"]
                                        for m in re.findall(r"Rtgs - \d+ / (\d{2}-\w{3}-\d{4})", b)) if d)
        upsert(works, {
            "id": f"bbmp-wo:{wo}", "source": "bbmp-workorders", "source_id": wo,
            "source_url": f"https://data.opencity.in/dataset/{g['dataset']}",
            "source_note": f"BBMP accounts portal (accounts.bbmp.gov.in) work order {wo}, "
                           f"republished by OpenCity in '{g['dataset']}'.",
            "title": g["title"], "agency": "Bruhat Bengaluru Mahanagara Palike (now GBA)",
            "office": "", "contractor": g["contractor"], "state": "Karnataka", "state_lgd": "29",
            "city": "bengaluru", "place": "Bengaluru", "pincode": "",
            "ward_ids": ";".join(wards), "ward_match": how,
            "location_text": f"BBMP ward {g['ward']} ({g['regime']}-ward map)" if g["regime"] != "common"
                             else f"Multi-ward work (code {g['ward']})",
            "sanctioned_cost": "", "cost_basis": "", "amount_paid": str(g["paid"]) if g["paid"] else "",
            "published_date": "", "start_date": "",
            "period_days": "", "deadline": "", "deadline_basis": "",
            "status": f"Bill paid on {paid_dates[-1]}" if paid_dates else "Work order issued",
        })
        kept += 1
    report.add("bbmp-workorders", f"{len(groups)} work orders read, {kept} road works kept")
