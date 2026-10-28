"""OpenCity (data.opencity.in, CKAN) datasets about Bengaluru waste and traffic, plus a
reachability check of official sites from GitHub's servers. -> raw27/"""
import json, os, requests
OUT = "raw27"; os.makedirs(OUT, exist_ok=True)
H = {"User-Agent": "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"}
API = "https://data.opencity.in/api/3/action/package_search"
found = {}
for q in ["garbage", "waste", "solid waste", "black spot", "blackspot", "dry waste", "swm", "sanitation", "toilet",
          "traffic", "challan", "accident", "road safety", "parking", "signal", "junction", "violation"]:
    try:
        d = requests.get(API, params={"q": q, "rows": 100}, headers=H, timeout=60).json()
    except Exception as e:
        found["_err_" + q] = str(e)[:200]; continue
    for p in d.get("result", {}).get("results", []):
        found[p["name"]] = {"title": p.get("title"), "modified": p.get("metadata_modified"), "org": (p.get("organization") or {}).get("title"),
                            "notes": (p.get("notes") or "")[:600], "tags": [t["name"] for t in p.get("tags", [])],
                            "resources": [{"name": r.get("name"), "format": r.get("format"), "url": r.get("url"), "modified": r.get("last_modified")} for r in p.get("resources", [])],
                            "q": q}
json.dump(found, open(f"{OUT}/opencity.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
reach = {}
for u in ["https://btp.karnataka.gov.in/", "https://gba.karnataka.gov.in/", "https://site.bbmp.gov.in/", "https://bswml.in/",
          "https://transport.karnataka.gov.in/", "https://echallan.parivahan.gov.in/"]:
    try:
        r = requests.get(u, headers=H, timeout=30)
        reach[u] = [r.status_code, len(r.content)]
    except Exception as e:
        reach[u] = str(e)[:150]
json.dump(reach, open(f"{OUT}/reach.json", "w"), indent=1)
