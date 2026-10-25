"""Save every JavaScript chunk of the NGO Darpan and UDISE+ Know Your School apps, so the
API calls (base URL, search endpoints, request signing) can be read offline. -> raw17/"""
import json, os, re
import requests

OUT = "raw17"
SITES = {"ngodarpan": "https://ngodarpan.gov.in/", "kys": "https://kys.udiseplus.gov.in/"}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
s = requests.Session(); s.headers["User-Agent"] = UA
log = []
for name, base in SITES.items():
    d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
    try:
        page = s.get(base, timeout=60).text
    except Exception as e:
        log.append({"site": name, "error": str(e)[:300]}); continue
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(page)
    todo = set(re.findall(r'(?:src|href)="([^"]+\.js)"', page)) | set(re.findall(r'chunk-[A-Z0-9]+\.js', page))
    done = set()
    while todo and len(done) < 200:
        f = todo.pop()
        if f in done or f.startswith("http") and not f.startswith(base):
            continue
        done.add(f)
        url = f if f.startswith("http") else base + f.lstrip("./")
        try:
            r = s.get(url, timeout=60)
        except Exception as e:
            log.append({"site": name, "file": f, "error": str(e)[:200]}); continue
        fn = os.path.basename(url.split("?")[0])
        open(os.path.join(d, fn), "w", encoding="utf-8").write(r.text)
        log.append({"site": name, "file": fn, "status": r.status_code, "bytes": len(r.text)})
        todo |= set(re.findall(r'chunk-[A-Z0-9]+\.js', r.text)) - done
try:
    log.append({"seen_from_country": s.get("https://ipinfo.io/country", timeout=20).text.strip()})
except Exception as e:
    log.append({"seen_from_country": "?", "error": str(e)[:100]})
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1)
print(json.dumps(log[-1]))
