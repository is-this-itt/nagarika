"""Delhi MLALAD: robots.txt and the first pages of udd.delhi.gov.in/mlalad-scheme. -> raw23/"""
import json, os
import requests, urllib3
urllib3.disable_warnings()
OUT = "raw23"; os.makedirs(OUT, exist_ok=True)
B = "https://udd.delhi.gov.in"
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"
log = []
for name, path in [("robots.txt", "/robots.txt"), ("p0.html", "/mlalad-scheme"), ("p1.html", "/mlalad-scheme?page=1"),
                   ("p2.html", "/mlalad-scheme?page=2"), ("mlalad.html", "/mlalad")]:
    try:
        r = s.get(B + path, timeout=90, verify=False)
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(r.text)
        log.append({"url": r.url, "status": r.status_code, "bytes": len(r.text), "file": name})
    except Exception as e:
        log.append({"url": B + path, "error": str(e)[:200]})
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1)
