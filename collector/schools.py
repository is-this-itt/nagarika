"""Schools by district, from UDISE+ "Basic Details of Schools" (Ministry of Education),
as republished by the India Data Portal under the Open Data Commons Attribution licence.

The file is about 400 MB, so it is not kept in the repository: the site build downloads
it (cached between runs, see update.yml) and this script turns it into one small file per
district in _site/data/schools/, plus an index. Only operational schools are kept.

Row fields: see FIELDS. mg is a group of the management: G government (state or central
departments, local bodies, KV, JNV and similar), A government-aided, P private unaided
recognised, U unrecognised (including unrecognised madrasas).
"""
import csv
import json
import os
import re
import sys

SOURCE_URL = ("https://ckan.indiadataportal.com/dataset/f1b2fdba-3b56-47ca-bfc6-819fc64b712a/resource/"
              "457fddf1-982f-4c85-855d-5095578accc1/download/basic-details-of-schools.csv")
SOURCE_PAGE = "https://ckan.indiadataportal.com/dataset/udise"
AS_OF = "UDISE+ data retrieved by the India Data Portal in January 2022"

FIELDS = ["code", "name", "block", "village", "pin", "mg", "management", "from", "to", "type",
          "lat", "lon", "teachers", "students", "est", "area"]


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def group(m):
    m = m.lower()
    if "unrecogni" in m:
        return "U"
    if "unaided" in m or "private" in m:
        return "P"
    if "aided" in m:
        return "A"
    return "G"


def num(v, cast=int):
    try:
        return cast(float(v))
    except (TypeError, ValueError):
        return None


def build(csv_path, out_dir):
    os.makedirs(os.path.join(out_dir, "schools"), exist_ok=True)
    districts = {}
    with open(csv_path, encoding="utf-8", errors="replace", newline="") as f:
        for r in csv.DictReader(f):
            if r.get("status") != "Operational":
                continue
            key = (r["state_name"].strip(), r["district_name"].strip())
            lat, lon = num(r["latitude"], float), num(r["longitude"], float)
            if lat is not None and not (5 < lat < 38 and 67 < lon < 98):
                lat = lon = None
            districts.setdefault(key, []).append([
                r["udise_school_code"], r["school_name"].strip(), r["subdistrict_name"].strip(),
                r["village_name"].strip(), r["pincode"] if re.fullmatch(r"\d{6}", r["pincode"] or "") else "",
                group(r["management"]), r["management"].strip(), num(r["class_from"]), num(r["class_to"]),
                {"Girls Only": "G", "Boys Only": "B"}.get(r["school_type"], "C"),
                round(lat, 5) if lat is not None else None, round(lon, 5) if lon is not None else None,
                num(r["total_teachers"]), num(r["class_with_pre_primary_students"]),
                num(r["year_of_establishment"]), (r["location_type"] or "")[:1],
            ])
    index = {}
    for (st, dist), rows in sorted(districts.items()):
        ss, ds = slug(st), slug(dist)
        rows.sort(key=lambda x: x[1])
        os.makedirs(os.path.join(out_dir, "schools", ss), exist_ok=True)
        with open(os.path.join(out_dir, "schools", ss, ds + ".json"), "w", encoding="utf-8") as f:
            json.dump({"fields": FIELDS, "rows": rows}, f, separators=(",", ":"), ensure_ascii=False)
        s = index.setdefault(ss, {"state": st, "slug": ss, "districts": []})
        count = lambda g: sum(1 for x in rows if x[5] == g)
        s["districts"].append({"name": dist, "slug": ds, "schools": len(rows), "government": count("G"),
                               "aided": count("A"), "private": count("P"), "unrecognised": count("U")})
    out = {"as_of": AS_OF, "source": SOURCE_PAGE, "states": sorted(index.values(), key=lambda s: s["state"])}
    with open(os.path.join(out_dir, "schools_index.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
    return out["states"]


if __name__ == "__main__":
    states = build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "_site/data")
    print(f"{sum(len(s['districts']) for s in states)} districts in {len(states)} states")
