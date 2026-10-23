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


# Bengaluru assembly constituency -> Lok Sabha constituency (2008 delimitation).
# Values are eSAKSHI constituency ids, used to link a ward to its MP's MPLADS works.
BENGALURU_AC_TO_PC = {
    **dict.fromkeys(["K.R. Pura", "Byatarayanapura", "Yeshwanthapura", "Dasarahalli", "Mahalakshmi Layout",
                     "Malleshwaram", "Hebbal", "Pulakeshinagar"], ("181", "Bangalore North")),
    **dict.fromkeys(["Shivajinagar", "Shanthinagar", "Gandhinagara", "Rajajinagar", "Chamrajapet",
                     "Sarvagnanagar", "C.V. Raman Nagar", "Mahadevapura"], ("183", "Bangalore Central")),
    **dict.fromkeys(["Govindraj Nagar", "Vijayanagar", "Chickpet", "Basavanagudi", "Padmanabanagar",
                     "B.T.M Layout", "Jayanagar", "Bommanahalli"], ("182", "Bangalore South")),
    **dict.fromkeys(["Rajarajeshwarinagar", "Bangalore South", "Anekal"], ("166", "Bangalore Rural")),
    "Yelahanka": ("171", "Chikballapur"),
}


def load_wards(city):
    path = os.path.join(BOUNDARIES, f"{city}.geojson")
    if not os.path.exists(path):
        return []
    return [f["properties"] for f in json.load(open(path))["features"]]


def _norm(s):
    return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower()).strip()


# Mumbai wards created after our 24-ward map, and the ward each was carved from.
MUMBAI_SPLIT = {"K/N": "K/E", "P/E": "P/N"}


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
        self.approx = ""  # set to the source's ward code when the match is approximate
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
            # "K/E ward", "G/North", "RC ward", "P South ward", "Pwest Ward", "L Ward", "ward G/S"
            for m in re.finditer(r"\b([A-T])\s*/\s*(N|S|E|W|C|North|South|East|West|Central)\b"
                                 r"|\b([A-T])\s*(N|S|E|W|C|North|South|East|West|Central)\s*-?\s*ward\b"
                                 r"|\b([A-T])\s+ward\b|\bward\s+([A-T])\b(?!\s*/)", text, re.I):
                if m.group(1) or m.group(3):
                    letter, side = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
                    code = f"{letter.upper()}/{side[0].upper()}"
                else:
                    code = (m.group(5) or m.group(6)).upper()
                if code in MUMBAI_SPLIT:  # a ward newer than our map: use the ward it was carved from
                    self.approx = code
                    code = MUMBAI_SPLIT[code]
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
