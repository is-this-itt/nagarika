"""Pilot cities, their ward maps, and matching works to wards.

Ward maps are converted once by `python collector/boundaries.py` into
data/boundaries/<city>.geojson with normalised properties:
    ward_key   unique within the city, used in URLs and works.csv
    ward_no    number as the city uses it
    ward_name  English name
    zone       corporation / zone, if any
"""
import json
import os
import re

from common import DATA

BOUNDARIES = os.path.join(DATA, "boundaries")

CITIES = {
    "bengaluru": {
        "name": "Bengaluru", "state": "Karnataka",
        "ward_map": "Greater Bengaluru Authority wards, 2025 delimitation (369 wards in 5 corporations)",
        "ward_map_source": "https://data.opencity.in/dataset/gba-wards-delimitation-2025",
    },
    "chennai": {
        "name": "Chennai", "state": "Tamil Nadu",
        "ward_map": "Greater Chennai Corporation wards, 2022 (200 wards)",
        "ward_map_source": "https://data.opencity.in/dataset/gcc-ward-information",
    },
    "mumbai": {
        "name": "Mumbai", "state": "Maharashtra",
        "ward_map": "BMC administrative wards (24 wards, e.g. K/E, L)",
        "ward_map_source": "https://data.opencity.in/dataset/mumbai-wards-map",
    },
}


def load_wards(city):
    path = os.path.join(BOUNDARIES, f"{city}.geojson")
    if not os.path.exists(path):
        return []
    return [f["properties"] for f in json.load(open(path))["features"]]


def _norm(s):
    return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower()).strip()


class WardMatcher:
    """Finds wards named in free text. Only unambiguous matches are returned."""

    def __init__(self, city):
        self.city = city
        self.wards = load_wards(city)
        self.by_no = {}
        names = {}
        for w in self.wards:
            self.by_no.setdefault(str(w["ward_no"]), []).append(w["ward_key"])
            n = _norm(w["ward_name"])
            n = re.sub(r"\bward\b", "", n).strip()
            if len(n) >= 5:
                names.setdefault(n, []).append(w["ward_key"])
        # A name shared by two wards cannot be matched from text alone.
        self.names = {n: keys[0] for n, keys in names.items() if len(keys) == 1}
        self.name_re = re.compile(
            r"\b(" + "|".join(sorted(map(re.escape, self.names), key=len, reverse=True)) + r")\b"
        ) if self.names else None

    def match(self, text):
        if not self.wards or not text:
            return []
        t = _norm(text)
        found = []
        if self.city == "chennai":
            # "Ward 114", "Ward No.114", "Dn114,116,120", "Division 23"
            for m in re.finditer(r"\b(?:ward|wd|dn|div|division)\s*(?:no\.?|nos\.?|number)?\s*[-:.]?\s*"
                                 r"((?:\d{1,3}\s*(?:,|&|and|/)\s*)*\d{1,3})", text, re.I):
                for n in re.findall(r"\d{1,3}", m.group(1)):
                    found += self.by_no.get(str(int(n)), [])
        elif self.city == "mumbai":
            # "K/E ward", "L Ward", "P/North ward", "ward G/S"
            for m in re.finditer(r"\b([A-T])\s*/\s*(N|S|E|W|C|North|South|East|West|Central)\b"
                                 r"|\b([A-T])\s+ward\b|\bward\s+([A-T])\b", text, re.I):
                if m.group(1):
                    code = f"{m.group(1).upper()}/{m.group(2)[0].upper()}"
                else:
                    code = (m.group(3) or m.group(4)).upper()
                found += self.by_no.get(code, [])
        if self.name_re:
            found += [self.names[m.group(1)] for m in self.name_re.finditer(t)]
        out = []
        for k in found:
            if k not in out:
                out.append(k)
        return out


def point_in_ward(city, lon, lat):
    """Ward key containing a point, or ''. Used for the old-BBMP crosswalk."""
    from shapely.geometry import Point, shape
    path = os.path.join(BOUNDARIES, f"{city}.geojson")
    p = Point(lon, lat)
    for f in json.load(open(path))["features"]:
        if shape(f["geometry"]).contains(p):
            return f["properties"]["ward_key"]
    return ""
