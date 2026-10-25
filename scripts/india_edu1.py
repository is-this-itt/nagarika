"""Education sources: what can be read without login (run from India).
myScheme (schemes), NGO Darpan (NGOs), UDISE+ Know Your School (schools), NSP (scholarships)."""
import json, os, re, requests, urllib3
from urllib.parse import urljoin, urlparse
urllib3.disable_warnings()
OUT = "raw13"
os.makedirs(OUT, exist_ok=True)
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
     "Accept-Language": "en-IN,en;q=0.9"}
PAGES = {
    "myscheme": "https://www.myscheme.gov.in/search/category/Education%20%26%20Learning",
    "myscheme_home": "https://www.myscheme.gov.in/",
    "ngodarpan": "https://ngodarpan.gov.in/",
    "ngodarpan_state": "https://ngodarpan.gov.in/index.php/home/statewise",
    "ngodarpan_sector": "https://ngodarpan.gov.in/index.php/home/sectorwise",
    "kys": "https://kys.udiseplus.gov.in/",
    "udise_src": "https://src.udiseplus.gov.in/searchSchool",
    "nsp": "https://scholarships.gov.in/",
    "ssp_kar": "https://ssp.postmatric.karnataka.gov.in/",
}
log = []

def save(name, text):
    with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
        f.write(text)

for k, url in PAGES.items():
    try:
        r = requests.get(url, headers=H, timeout=60, verify=False)
    except Exception as e:
        log.append({"page": k, "url": url, "error": repr(e)[:300]})
        continue
    save(f"{k}.html", r.text)
    scripts = [urljoin(r.url, s) for s in re.findall(r'<script[^>]+src=["\']([^"\']+)', r.text)]
    e = {"page": k, "url": url, "status": r.status_code, "final": r.url, "bytes": len(r.text), "scripts": scripts[:40],
         "links": sorted({urljoin(r.url, l) for l in re.findall(r'href=["\']([^"\'#]+)', r.text)})[:150], "js": []}
    # Save same-site app bundles: API hosts and keys are usually inside them.
    host = urlparse(r.url).netloc
    for i, s in enumerate([s for s in scripts if urlparse(s).netloc in (host, "")][:12]):
        try:
            j = requests.get(s, headers=H, timeout=60, verify=False)
            name = f"{k}_js{i:02d}.js"
            save(name, j.text)
            apis = sorted(set(re.findall(r'https?://[a-z0-9.-]*(?:api|gov\.in)[^"\'\s`]*', j.text)))[:60]
            keys = re.findall(r'["\']?x-api-key["\']?\s*[:=]\s*["\']([^"\']{10,})', j.text, re.I)[:3]
            e["js"].append({"url": s, "file": name, "bytes": len(j.text), "apis": apis, "keys": keys})
        except Exception as ex:
            e["js"].append({"url": s, "error": repr(ex)[:150]})
    log.append(e)

# myScheme's search API (used by its website).
keys = [k for e in log for j in e.get("js", []) for k in j.get("keys", [])]
for i, key in enumerate(keys[:2] or [""]):
    q = json.dumps([{"identifier": "schemeCategory", "value": "Education & Learning"}, {"identifier": "beneficiaryState", "value": "Karnataka"}])
    try:
        r = requests.get("https://api.myscheme.gov.in/search/v5/schemes", params={"lang": "en", "q": q, "keyword": "", "sort": "", "from": 0, "size": 50},
                         headers={**H, "x-api-key": key, "Origin": "https://www.myscheme.gov.in", "Referer": "https://www.myscheme.gov.in/"}, timeout=60)
        save(f"myscheme_api{i}.json", r.text)
        log.append({"api": "myscheme search", "status": r.status_code, "bytes": len(r.text), "with_key": bool(key)})
    except Exception as ex:
        log.append({"api": "myscheme search", "error": repr(ex)[:200]})

with open(f"{OUT}/_log.json", "w", encoding="utf-8") as f:
    json.dump(log, f, indent=1, ensure_ascii=False)
