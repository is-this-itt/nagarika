"""Download ward maps, normalise them, and build the old-BBMP-ward crosswalk.

Run rarely (ward maps change only with delimitation):
    python collector/boundaries.py            # download from OpenCity
    python collector/boundaries.py --raw DIR  # use already-converted GeoJSON files in DIR
Writes data/boundaries/<city>.geojson and data/boundaries/bbmp_crosswalk.json.
"""
import json
import os
import re
import sys

import requests
from shapely.geometry import shape

from common import DATA
from kml import kml_to_features

OUT = os.path.join(DATA, "boundaries")

SOURCES = {
    "gba_369": "https://data.opencity.in/dataset/863209cb-4ced-4f51-b5c5-156939c50922/resource/9013d656-8051-4e2d-9648-46efd0d86d3d/download/gba-369-wards-december-2025.kml",
    "bbmp_198": "https://data.opencity.in/dataset/87b978d1-352e-4b90-aa2c-9991e55d3425/resource/a0329df6-2924-43f4-8fe4-7a6ffcc1d53d/download/806d6b9c-e8d9-4eb0-a3a3-b2ba68ec3cda.kml",
    "bbmp_243": "https://data.opencity.in/dataset/87b978d1-352e-4b90-aa2c-9991e55d3425/resource/9423dbca-db2b-47df-823e-8546f4fb8f2a/download/53418b48-c08d-43bd-be0e-31b46cd0f798.kml",
    "bbmp_225": "https://data.opencity.in/dataset/7b492849-a5cb-439b-89e9-e03522055e6a/resource/7857d752-dda4-4e5e-b9e6-53146372f86b/download/b272c5b2-3e66-4b0f-a59f-35ec7b4caa1e.kml",
    "chennai_200": "https://data.opencity.in/dataset/c77de7f8-e377-4990-90fc-4f0f8ca0e2d2/resource/e90176d4-319a-45bd-918e-ecce4f048c4d/download/6a8a05ed-a41c-492a-aade-ff7517e1a4b1.kml",
    "mumbai_24": "https://data.opencity.in/dataset/60f27371-717e-40b6-8554-fdc7e6c10437/resource/0318c3e8-1530-4bf4-b29b-7281573dee8a/download/e7a671e2-1f71-4219-a83c-556334bc9021.kml",
}

MUMBAI_NAMES = {  # BMC ward codes to the area names people use
    "A": "Colaba, Fort", "B": "Dongri, Sandhurst Road", "C": "Bhuleshwar, Marine Lines",
    "D": "Grant Road, Malabar Hill", "E": "Byculla", "F/N": "Matunga, Sion",
    "F/S": "Parel", "G/N": "Dadar, Mahim, Dharavi", "G/S": "Worli, Elphinstone",
    "H/E": "Bandra East, Santacruz East", "H/W": "Bandra West, Khar West",
    "K/E": "Andheri East", "K/W": "Andheri West, Juhu", "L": "Kurla",
    "M/E": "Chembur East, Govandi, Mankhurd", "M/W": "Chembur West", "N": "Ghatkopar",
    "P/N": "Malad", "P/S": "Goregaon", "R/C": "Borivali", "R/N": "Dahisar",
    "R/S": "Kandivali", "S": "Bhandup, Powai, Vikhroli", "T": "Mulund",
}


def load_raw(raw_dir):
    out = {}
    for key, url in SOURCES.items():
        if raw_dir:
            out[key] = json.load(open(os.path.join(raw_dir, f"{key}.geojson")))["features"]
        else:
            r = requests.get(url, timeout=180, headers={"User-Agent": "nagarika (+github.com/is-this-itt/nagarika)"})
            r.raise_for_status()
            out[key] = kml_to_features(r.content)
    return out


def norm_features(feats, fn):
    res = []
    for f in feats:
        p = fn(f["properties"])
        if p:
            res.append({"type": "Feature", "properties": p, "geometry": f["geometry"]})
    return {"type": "FeatureCollection", "features": res}


def gba(p):
    corp = p["Corporation"].strip()
    return {"ward_key": f"{corp.lower()}-{int(p['ward_id'])}", "ward_no": str(int(p["ward_id"])),
            "ward_name": p["ward_name"].strip(), "zone": f"Bengaluru {corp} City Corporation",
            "assembly": p.get("ac", "").strip()}


def chennai(p):
    n = str(int(re.sub(r"\D", "", p["name"])))
    return {"ward_key": n, "ward_no": n, "ward_name": f"Ward {n}", "zone": ""}


def mumbai(p):
    code = p["NAME"].strip().upper()
    return {"ward_key": code.replace("/", "-").lower(), "ward_no": code,
            "ward_name": f"{code} ward ({MUMBAI_NAMES.get(code, '')})".replace(" ()", ""), "zone": ""}


def old_bbmp_number(key, p):
    if key == "bbmp_198":
        return str(int(re.sub(r"\D", "", p["name"])))
    if key == "bbmp_243":
        return str(int(p["WardNo"]))
    return str(int(p["id"]))


def main():
    raw_dir = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--raw" else None
    raw = load_raw(raw_dir)
    os.makedirs(OUT, exist_ok=True)
    cities = {"bengaluru": norm_features(raw["gba_369"], gba),
              "chennai": norm_features(raw["chennai_200"], chennai),
              "mumbai": norm_features(raw["mumbai_24"], mumbai)}
    for city, fc in cities.items():
        json.dump(fc, open(os.path.join(OUT, f"{city}.geojson"), "w"), separators=(",", ":"))
        print(city, len(fc["features"]), "wards")

    # Old BBMP ward -> the GBA wards covering at least 20% of it, largest first.
    # Old wards were split up in 2025, so this is approximate by nature.
    new = [(f["properties"]["ward_key"], shape(f["geometry"])) for f in cities["bengaluru"]["features"]]
    cross = {}
    for key, regime in (("bbmp_198", "198"), ("bbmp_243", "243"), ("bbmp_225", "225")):
        cross[regime] = {}
        for f in raw[key]:
            old = shape(f["geometry"])
            if not old.area:
                continue
            shares = sorted(((k, g.intersection(old).area / old.area) for k, g in new if g.intersects(old)),
                            key=lambda kv: -kv[1])
            keep = [{"ward_key": k, "share": round(s, 2)} for k, s in shares if s >= 0.2] or \
                   [{"ward_key": shares[0][0], "share": round(shares[0][1], 2)}]
            cross[regime][old_bbmp_number(key, f["properties"])] = keep
    json.dump(cross, open(os.path.join(OUT, "bbmp_crosswalk.json"), "w"), separators=(",", ":"), sort_keys=True)
    print("crosswalk", {k: len(v) for k, v in cross.items()})


if __name__ == "__main__":
    main()
