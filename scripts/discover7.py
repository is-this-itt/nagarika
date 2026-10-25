"""MLA local area development fund portals: what can be read without login (run from India)."""
import json, os, re, requests, urllib3
from urllib.parse import urljoin, urlparse
urllib3.disable_warnings()
OUT = "raw11"
os.makedirs(OUT, exist_ok=True)
BOT = {"User-Agent": "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"}
BROWSER = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
           "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-IN,en;q=0.9"}
SITES = {
    "odisha": ["https://mlalads.odisha.gov.in/"],
    "mp": ["http://mlalads.mp.gov.in/", "https://mlalads.mp.gov.in/"],
    "delhi": ["https://udd.delhi.gov.in/mlalad", "http://udd.delhi.gov.in/"],
    "kar_plan": ["https://planning.karnataka.gov.in/"],
}
WANT = re.compile(r"report|work|district|constituen|mla|scheme|dashboard|project|sanction|fund|lad", re.I)
SKIP = (".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2")
log = []

def save(name, text):
    with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
        f.write(text)

def get(url):
    last = None
    for h in (BOT, BROWSER):
        try:
            return requests.get(url, headers=h, timeout=60, verify=False)
        except Exception as e:
            last = e
    raise last

for k, urls in SITES.items():
    for url in urls:
        try:
            r = get(url)
        except Exception as e:
            log.append({"site": k, "url": url, "error": repr(e)[:300]})
            continue
        save(f"{k}_home.html", r.text)
        links = sorted({urljoin(r.url, l) for l in re.findall(r'href=["\']([^"\'#]+)', r.text)})
        links = [l for l in links if not l.lower().endswith(SKIP)]
        entry = {"site": k, "url": url, "status": r.status_code, "final": r.url, "bytes": len(r.text),
                 "links": links[:200], "scripts": re.findall(r'<script[^>]+src=["\']([^"\']+)', r.text)[:40], "pages": []}
        host = urlparse(r.url).netloc
        follow = [l for l in links if urlparse(l).netloc == host and WANT.search(l)][:25]
        for i, l in enumerate(follow):
            try:
                p = get(l)
                name = f"{k}_p{i:02d}" + (".pdf" if p.headers.get("content-type", "").startswith("application/pdf") else ".html")
                if name.endswith(".pdf"):
                    open(f"{OUT}/{name}", "wb").write(p.content[:5_000_000])
                else:
                    save(name, p.text)
                entry["pages"].append({"url": l, "file": name, "status": p.status_code, "bytes": len(p.content)})
            except Exception as e:
                entry["pages"].append({"url": l, "error": repr(e)[:200]})
        log.append(entry)
        break
with open(f"{OUT}/_log.json", "w", encoding="utf-8") as f:
    json.dump(log, f, indent=1, ensure_ascii=False)
