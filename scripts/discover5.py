"""MPLADS eSAKSHI: fetch the public dashboard, its scripts, and list REST endpoints."""
import os, re, json, urllib.parse
import requests

B = "https://mplads.mospi.gov.in"
os.makedirs("raw5", exist_ok=True)
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36"
log = open("raw5/_index.txt", "w")

def get(name, url, **kw):
    try:
        r = s.get(url, timeout=60, **kw)
        open(f"raw5/{name}", "wb").write(r.content)
        log.write(f"{r.status_code} {len(r.content)} {name} {url}\n"); log.flush()
        return r
    except Exception as e:
        log.write(f"ERR {name} {url} {e!r}\n"); return None

pages = {"dashboard.html": B + "/digigov/dashboard.html", "home.html": B + "/"}
texts = {}
for n, u in pages.items():
    r = get(n, u)
    if r is not None: texts[n] = r.text
scripts = set()
for t in texts.values():
    for src in re.findall(r'<script[^>]+src="([^"]+)"', t):
        scripts.add(urllib.parse.urljoin(B + "/digigov/", src))
alljs = ""
for i, u in enumerate(sorted(scripts)):
    if "mospi.gov.in" not in u:
        continue
    r = get(f"js_{i}_{os.path.basename(urllib.parse.urlparse(u).path)}", u)
    if r is not None: alljs += r.text
for t in texts.values():
    alljs += t
eps = sorted(set(re.findall(r'["\'`](/?(?:rest|digigov/rest|api)/[A-Za-z0-9_/.-]+)', alljs)))
open("raw5/_endpoints.txt", "w").write("\n".join(eps))
# Try GET on endpoints that take no obvious parameters.
for i, e in enumerate(eps[:80]):
    u = urllib.parse.urljoin(B + "/", e.lstrip("/"))
    get(f"ep_{i}.json", u, headers={"Accept": "application/json"})
