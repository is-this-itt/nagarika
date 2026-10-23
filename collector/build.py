"""Build the static site into _site/ from site/ and data/.

Derived fields (overdue flags, ward totals) are computed here, not stored, so they
always reflect today's date.
"""
import csv
import datetime as dt
import json
import os
import shutil

from common import DATA, FIELDS, ROOT, WORKS_CSV, load_works
from places import CITIES, load_wards

OUT = os.path.join(ROOT, "_site")
DONE = ("complet", "cancel", "recalled", "retendered", "no bids", "bill paid")


def flag(r, today):
    """overdue: official deadline passed; past_estimate: estimated finish passed."""
    if not r["deadline"] or r["deadline"] >= today:
        return ""
    if any(w in r["status"].lower() for w in DONE):
        return ""
    return "overdue" if r["deadline_basis"] == "official" else "past_estimate"


def num(v):
    return int(v) if v and v.isdigit() else 0


def main():
    today = dt.date.today().isoformat()
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(os.path.join(ROOT, "site"), OUT)
    os.makedirs(os.path.join(OUT, "data", "wards"), exist_ok=True)

    works = load_works()
    rows = []
    for r in works.values():
        r = dict(r)
        r["flag"] = flag(r, today)
        rows.append(r)
    rows.sort(key=lambda r: (r["published_date"] or r["first_seen"]), reverse=True)

    # Compact JSON for the site: only the fields pages show.
    keep = [f for f in FIELDS if f not in ("state_lgd",)] + ["flag"]
    json.dump({"fields": keep, "rows": [[r[k] for k in keep] for r in rows]},
              open(os.path.join(OUT, "data", "works.json"), "w"), separators=(",", ":"), ensure_ascii=False)

    cities, ward_index = [], {}
    for slug, c in CITIES.items():
        wards = load_wards(slug)
        ward_index[slug] = [[w["ward_key"], w["ward_no"], w["ward_name"], w.get("zone", ""), w.get("assembly", "")]
                            for w in wards]
        cw = [r for r in rows if r["city"] == slug]
        src = os.path.join(DATA, "boundaries", f"{slug}.geojson")
        if os.path.exists(src):
            shutil.copy(src, os.path.join(OUT, "data", "wards", f"{slug}.geojson"))
        cities.append({**c, "slug": slug, "wards": len(wards), "works": len(cw),
                       "unmatched": sum(1 for r in cw if not r["ward_ids"]),
                       "overdue": sum(1 for r in cw if r["flag"]),
                       "cost": sum(num(r["sanctioned_cost"]) for r in cw),
                       "paid": sum(num(r["amount_paid"]) for r in cw)})
    states = {}
    for r in rows:
        s = states.setdefault(r["state"] or "Unknown", {"works": 0, "flagged": 0})
        s["works"] += 1
        s["flagged"] += bool(r["flag"])
    sources = {}
    for r in rows:
        sources[r["source"]] = sources.get(r["source"], 0) + 1
    meta = {"built": today, "total": len(rows), "cities": cities, "states": states, "sources": sources,
            "last_checked": max((r["last_checked"] for r in rows), default="")}
    json.dump(meta, open(os.path.join(OUT, "data", "meta.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(ward_index, open(os.path.join(OUT, "data", "wards.json"), "w"), separators=(",", ":"), ensure_ascii=False)

    shutil.copy(WORKS_CSV, os.path.join(OUT, "data", "works.csv")) if os.path.exists(WORKS_CSV) else None
    shutil.copy(os.path.join(DATA, "LICENSE.md"), os.path.join(OUT, "data", "LICENSE.md"))
    print(f"built _site with {len(rows)} works")


if __name__ == "__main__":
    main()
