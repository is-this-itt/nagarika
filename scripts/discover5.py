"""MPLADS eSAKSHI pass 3: per-work report for one constituency."""
import os, json
import requests

B = "https://mplads.mospi.gov.in/rest/PreLoginDashboardData/"
os.makedirs("raw7", exist_ok=True)
s = requests.Session()
UA = "Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36"
s.headers.update({"User-Agent": UA, "X-Client-UA": UA, "Referer": "https://mplads.mospi.gov.in/digigov/dashboard.html"})
log = open("raw7/_index.txt", "w")
def post(name, path, body):
    try:
        r = s.post(B + path, json=body, timeout=180)
        open(f"raw7/{name}", "wb").write(r.content[:3_000_000])
        log.write(f"{r.status_code} {len(r.content)} {name} {json.dumps(body)}\n"); log.flush()
    except Exception as e:
        log.write(f"ERR {name} {e!r}\n")
post("mps_ka.json", "getMpNamesData", {"state_combo": "18,2,7"})
post("mpconst_blrs.json", "getMpAndConstCombo", {"const_combo": "182,2,7"})
for i, combo in enumerate(["18,182,0,2", "18,182,0,7", "0,0,0,2"]):
    for key in ["Works Sanctioned", "Works Completed", "Works Recommended"]:
        post(f"rep_{i}_{key.split()[1].lower()}.json", "getTilesReportData", {"combo": combo, "key": key})
