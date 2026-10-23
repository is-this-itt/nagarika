"""Second discovery pass: drill into GePNIC tender pages and KPPP lookups."""
import re, html, json, os, csv, io, urllib.parse
import requests

os.makedirs("raw2", exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36"}
log = open("raw2/_index.txt", "w")

def save(name, r):
    open(f"raw2/{name}", "wb").write(r.content)
    log.write(f"{r.status_code} {len(r.content)} {name} {r.url}\n"); log.flush()

def links(s):
    return [html.unescape(h) for h in re.findall(r'href="([^"]*DirectLink[^"]*)"', s)]

for base, org in [("https://tntenders.gov.in/nicgep/app", "Corporation of Chennai"),
                  ("https://mahatenders.gov.in/nicgep/app", "Municipal Corporation of Greater Mumbai")]:
    tag = base.split("//")[1].split(".")[0]
    try:
        s = requests.Session(); s.headers.update(UA)
        r = s.get(base + "?page=FrontEndTendersByOrganisation&service=page", timeout=60)
        m = re.search(r'>\s*' + re.escape(org) + r'\s*</td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"', r.text)
        if not m: log.write(f"no org link {org}\n"); continue
        r = s.get(urllib.parse.urljoin(base, html.unescape(m.group(1))), timeout=60); save(f"{tag}_orglist.html", r)
        tl = [l for l in links(r.text) if "FrontEndViewTender" in l or "ViewTender" in l]
        log.write(f"{tag} tender links {len(tl)} sample {tl[:2]}\n")
        for i, l in enumerate(tl[:3]):
            r = s.get(urllib.parse.urljoin(base, l), timeout=60); save(f"{tag}_tender{i}.html", r)
    except Exception as e:
        log.write(f"ERR {tag} {e!r}\n")

K = "https://kppp.karnataka.gov.in/supplier-registration-service/v1/api/portal-service/"
KH = {**UA, "Referer": "https://kppp.karnataka.gov.in/", "Post": "CONTRACTOR-EPROC-CONTRACTOR"}
for path, name in [("200000/get-works-tender-general-info", "kppp_geninfo_200000.json"),
                   ("departments/activeDepartment", "kppp_departments.json"),
                   ("active-work-categories", "kppp_workcats.json"),
                   ("metrics/get-portal-metrics", "kppp_metrics.json")]:
    try: save(name, requests.get(K + path, headers=KH, timeout=60))
    except Exception as e: log.write(f"ERR {name} {e!r}\n")
# Find the highest valid works id (binary search between 300000 and 360000).
lo, hi = 300000, 360000
def ok(i):
    try: return requests.get(f"{K}{i}/works-tender-full-view", headers=KH, timeout=60).status_code == 200
    except Exception: return False
# ids are shared across types, so probe a small window around each midpoint
while hi - lo > 50:
    mid = (lo + hi) // 2
    if any(ok(mid + d) for d in range(0, 30, 3)): lo = mid
    else: hi = mid
log.write(f"kppp max works id ~ {lo}..{hi}\n")
# Sample a recent Bengaluru-ish record window to see department/location names.
names = {}
for i in range(lo - 400, lo, 4):
    try:
        r = requests.get(f"{K}{i}/works-tender-full-view", headers=KH, timeout=60)
        if r.status_code == 200:
            ts = r.json()["tenderSchedule"]; names[f'{ts["deptName"]} | {ts["locationName"]}'] = i
    except Exception: pass
json.dump(names, open("raw2/kppp_recent_depts.json", "w"), indent=1)

r = requests.get("https://data.opencity.in/dataset/280a1196-074e-43ac-acd9-914918b429f5/resource/6c2e5dfa-845c-440d-808c-3ed45b083059/download/bbmp-2025-26-243-wards-work-orders.csv", headers=UA, timeout=120)
open("raw2/bbmp_243_head.csv", "w").write("\n".join(r.text.splitlines()[:40]))
log.write(f"bbmp csv {r.status_code} rows {len(r.text.splitlines())}\n")
