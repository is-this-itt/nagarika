"""UP MLALADS (mlaladsup.in): save the public report pages and the site's own scripts,
to find the data calls behind them. -> raw22/"""
import json, os, re
import requests, urllib3
urllib3.disable_warnings()
OUT = "raw22"; os.makedirs(OUT, exist_ok=True)
B = "https://mlaladsup.in"
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
PAGES = ["/main/MLAWiseWorkCounts", "/main/DistrictWiseWorkCounts", "/main/IAWisePhysical", "/main/mlaProfile",
         "/main/districtProfile", "/main/expenseSummaryDetails", "/main/expenseSummaryDetailsDistrictWise",
         "/Main/MLAWiseFundRelease", "/main/DistrictWiseFundRelease"]
log, scripts = [], set()
for p in PAGES:
    try:
        r = s.get(B + p, timeout=90, verify=False)
        fn = p.strip("/").replace("/", "_") + ".html"
        open(os.path.join(OUT, fn), "w", encoding="utf-8").write(r.text)
        log.append({"url": B + p, "status": r.status_code, "bytes": len(r.text), "file": fn})
        scripts |= {x for x in re.findall(r'<script[^>]+src="([^"]+)"', r.text) if not x.startswith("http") or "mlaladsup" in x}
    except Exception as e:
        log.append({"url": B + p, "error": str(e)[:200]})
for x in sorted(scripts):
    url = x if x.startswith("http") else B + "/" + x.lstrip("/")
    if re.search(r"jquery|bootstrap|adminlte|datepicker|select2|moment|chart|plugins/", url, re.I) and "custom" not in url.lower():
        continue
    try:
        r = s.get(url, timeout=60, verify=False)
        fn = "js_" + re.sub(r"[^A-Za-z0-9.]+", "_", url.split("mlaladsup.in/")[-1])[:80]
        open(os.path.join(OUT, fn), "w", encoding="utf-8").write(r.text)
        log.append({"url": url, "status": r.status_code, "bytes": len(r.text), "file": fn})
    except Exception as e:
        log.append({"url": url, "error": str(e)[:200]})
log.append({"scripts": sorted(scripts)})
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1)
