"""Retry portals that dropped Python's TLS handshake, using Windows' own curl.exe
(Schannel TLS, like a browser) and record what comes back (run from India)."""
import json, os, re, subprocess
OUT = "raw16"
os.makedirs(OUT, exist_ok=True)
URLS = {
    "rte Andhra Pradesh": "https://cse.ap.gov.in/RTE", "rte Bihar": "https://pmsonline.bih.nic.in/rte",
    "rte Madhya Pradesh": "https://rteportal.mp.gov.in/", "rte Maharashtra": "https://student.maharashtra.gov.in/adm_portal/",
    "rte Rajasthan": "https://rajpsp.nic.in/PSP1/Home/home.aspx", "rte Telangana": "https://schooledu.telangana.gov.in/ISMS/",
    "rte Uttar Pradesh": "https://rte25.upsdc.gov.in/", "rte West Bengal": "https://banglarshiksha.gov.in/",
    "rte Kerala": "https://kescpcr.kerala.gov.in/rte-cell", "rte Gujarat": "https://rte.orpgujarat.com/",
    "sch Bihar": "https://pmsonline.bih.nic.in/", "sch Tamil Nadu": "https://umis.tn.gov.in/",
    "sch Uttar Pradesh": "https://scholarship.up.gov.in/", "sch West Bengal SVMCM": "https://svmcm.wbhed.gov.in/",
    "sch Madhya Pradesh": "https://scholarshipportal.mp.nic.in/", "sch Karnataka prematric": "https://ssp.prematric.karnataka.gov.in/",
    "mla Madhya Pradesh": "http://mlalads.mp.gov.in/", "mla Delhi": "https://udd.delhi.gov.in/mlalad",
    "check ipinfo": "https://ipinfo.io/json",
}
log = []
for i, (k, url) in enumerate(URLS.items()):
    name = f"{i:02d}.html"
    p = subprocess.run(["curl.exe", "-sS", "-L", "-k", "--max-time", "60", "-A",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
                        "-o", f"{OUT}/{name}", "-w", "%{http_code} %{url_effective} %{size_download}", url],
                       capture_output=True, text=True)
    title = ""
    if os.path.exists(f"{OUT}/{name}"):
        t = open(f"{OUT}/{name}", encoding="utf-8", errors="replace").read()
        m = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
        title = (m.group(1).strip() if m else t[:200])[:200]
    log.append({"what": k, "url": url, "out": p.stdout.strip(), "err": p.stderr.strip()[:300], "title": title, "file": name})
with open(f"{OUT}/_log.json", "w", encoding="utf-8") as f:
    json.dump(log, f, indent=1, ensure_ascii=False)
