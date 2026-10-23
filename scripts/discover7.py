"""MLA local area development fund portals: what can be read without login."""
import json, os, re, requests
OUT = "raw11"
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"}
log = []
SITES = {
    "odisha": "https://mlalads.odisha.gov.in/",
    "mp": "http://mlalads.mp.gov.in/",
    "up": "https://mlalads.up.gov.in/",
    "delhi": "https://udd.delhi.gov.in/mlalad",
    "kar_plan": "https://planning.karnataka.gov.in/",
}
for k, url in SITES.items():
    try:
        r = requests.get(url, headers=UA, timeout=60, verify=False)
        open(f"{OUT}/{k}_home.html", "w").write(r.text)
        links = sorted(set(re.findall(r'href=["\']([^"\'#]+)', r.text)))
        log.append({"site": k, "status": r.status_code, "final": r.url, "bytes": len(r.text),
                    "links": [l for l in links if not l.endswith((".css", ".js", ".png", ".jpg", ".ico"))][:150],
                    "scripts": re.findall(r'<script[^>]+src=["\']([^"\']+)', r.text)[:40]})
    except Exception as e:
        log.append({"site": k, "error": repr(e)[:300]})
json.dump(log, open(f"{OUT}/_log.json", "w"), indent=1)
