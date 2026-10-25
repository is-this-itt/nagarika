"""Odisha MLALADS: fetch the report page's JavaScript and try its data endpoints (run from India)."""
import json, os, re, requests, urllib3
urllib3.disable_warnings()
OUT = "raw12"
os.makedirs(OUT, exist_ok=True)
BASE = "https://mlalads.odisha.gov.in"
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"
log = []

def keep(name, r):
    with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
        f.write(r.text)
    log.append({"file": name, "url": r.request.url, "method": r.request.method, "status": r.status_code,
                "type": r.headers.get("content-type"), "bytes": len(r.content),
                "body": (r.request.body or "")[:300] if isinstance(r.request.body, str) else str(r.request.body)[:300]})

def tryit(name, method, path, **kw):
    try:
        keep(name, s.request(method, BASE + path, timeout=60, verify=False,
                             headers={"X-Requested-With": "XMLHttpRequest"}, **kw))
    except Exception as e:
        log.append({"file": name, "url": path, "error": repr(e)[:300]})

page = s.get(BASE + "/IPMS/Report", timeout=60, verify=False)
keep("report.html", page)
token = re.search(r'name="__RequestVerificationToken"[^>]*value="([^"]+)"', page.text)
for js in ["/landingpage/js/CustomJS/LandingPageReport.js", "/js/CustomJS/localization.js"]:
    tryit(js.rsplit("/", 1)[1], "GET", js)
home = s.get(BASE + "/", timeout=60, verify=False)
keep("home.html", home)

js = open(f"{OUT}/LandingPageReport.js", encoding="utf-8").read() if os.path.exists(f"{OUT}/LandingPageReport.js") else ""
paths = sorted(set(re.findall(r'["\'](/[A-Za-z]+/[A-Za-z/]+)["\']', js + home.text + page.text)))
log.append({"paths_found": paths, "has_token": bool(token)})
data = {"__RequestVerificationToken": token.group(1)} if token else {}
for i, p in enumerate(p for p in paths if re.search(r"Get|Ajax|List|Data", p)):
    tryit(f"get{i:02d}.txt", "GET", p)
    tryit(f"post{i:02d}.txt", "POST", p, data=data)
with open(f"{OUT}/_log.json", "w", encoding="utf-8") as f:
    json.dump(log, f, indent=1, ensure_ascii=False)
