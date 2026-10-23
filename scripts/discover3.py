"""Discovery pass 3: download ward maps and record their attribute names."""
import json, os, sys
sys.path.insert(0, "collector")
import requests
from kml import kml_to_features

URLS = {
    "gba_369": "https://data.opencity.in/dataset/863209cb-4ced-4f51-b5c5-156939c50922/resource/9013d656-8051-4e2d-9648-46efd0d86d3d/download/gba-369-wards-december-2025.kml",
    "bbmp_198": "https://data.opencity.in/dataset/87b978d1-352e-4b90-aa2c-9991e55d3425/resource/a0329df6-2924-43f4-8fe4-7a6ffcc1d53d/download/806d6b9c-e8d9-4eb0-a3a3-b2ba68ec3cda.kml",
    "bbmp_243": "https://data.opencity.in/dataset/87b978d1-352e-4b90-aa2c-9991e55d3425/resource/9423dbca-db2b-47df-823e-8546f4fb8f2a/download/53418b48-c08d-43bd-be0e-31b46cd0f798.kml",
    "bbmp_225": "https://data.opencity.in/dataset/7b492849-a5cb-439b-89e9-e03522055e6a/resource/7857d752-dda4-4e5e-b9e6-53146372f86b/download/b272c5b2-3e66-4b0f-a59f-35ec7b4caa1e.kml",
    "chennai_200": "https://data.opencity.in/dataset/c77de7f8-e377-4990-90fc-4f0f8ca0e2d2/resource/e90176d4-319a-45bd-918e-ecce4f048c4d/download/6a8a05ed-a41c-492a-aade-ff7517e1a4b1.kml",
    "mumbai_24": "https://data.opencity.in/dataset/60f27371-717e-40b6-8554-fdc7e6c10437/resource/0318c3e8-1530-4bf4-b29b-7281573dee8a/download/e7a671e2-1f71-4219-a83c-556334bc9021.kml",
}
os.makedirs("raw3", exist_ok=True)
summary = {}
for key, url in URLS.items():
    try:
        r = requests.get(url, timeout=180, headers={"User-Agent": "nagarika-discovery"})
        feats = kml_to_features(r.content)
        json.dump({"type": "FeatureCollection", "features": feats}, open(f"raw3/{key}.geojson", "w"))
        summary[key] = {"status": r.status_code, "count": len(feats),
                        "sample_props": [f["properties"] for f in feats[:3]]}
    except Exception as e:
        summary[key] = {"error": repr(e)}
json.dump(summary, open("raw3/_summary.json", "w"), indent=1, ensure_ascii=False)
# The BBMP CSVs, whole, for parser development.
os.makedirs("raw3/bbmp", exist_ok=True)
base = "https://data.opencity.in/dataset/280a1196-074e-43ac-acd9-914918b429f5/resource/"
for name, path in {"198": "7a6907c2-6efd-43d6-99ac-1d10f67b3f85/download/bbmp-2025-26-198-wards-work-orders.csv",
                   "243": "6c2e5dfa-845c-440d-808c-3ed45b083059/download/bbmp-2025-26-243-wards-work-orders.csv",
                   "225": "3e784947-b321-4cba-bedb-69de53450a83/download/bbmp-2025-26-225-wards-work-orders.csv",
                   "common": "71b93422-3d64-4de6-a823-468517f441e3/download/bbmp-2025-26-common-wards-work-orders.csv"}.items():
    open(f"raw3/bbmp/{name}.csv", "wb").write(requests.get(base + path, timeout=180).content)
