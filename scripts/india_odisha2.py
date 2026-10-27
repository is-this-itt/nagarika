"""Odisha MLALADS: try the MLA-wise recommended works report (MLA name, letter no., date)
and the MLA list per district. -> raw20/"""
import json, os
import requests

OUT = "raw20"; os.makedirs(OUT, exist_ok=True)
B = "https://mlalads.odisha.gov.in"
s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
                  "X-Requested-With": "XMLHttpRequest", "Referer": B + "/IPMS/Report"})
log = []
def get(name, path, params=None):
    try:
        r = s.get(B + path, params=params, timeout=90)
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(r.text)
        log.append({"file": name, "url": r.url, "status": r.status_code, "bytes": len(r.text), "head": r.text[:300]})
    except Exception as e:
        log.append({"file": name, "path": path, "error": str(e)[:200]})
get("report.html", "/IPMS/Report")
cols = ["rowNumber", "financialYear", "districtName", "constituencyName", "fullName", "letterNo", "strRecommendationDate",
        "recommendationAmount", "projectId", "workDescription", "workStatus"]
base = {"DistrictId": 0, "FinancialYear": 2026, "ConstituencyId": 0, "MlaId": 0, "ExtSearch": ""}
dt = {"draw": 1, "start": 0, "length": 100, "search[value]": "", "search[regex]": "false", "order[0][column]": 1, "order[0][dir]": "asc"}
for i, c in enumerate(cols):
    dt[f"columns[{i}][data]"] = c; dt[f"columns[{i}][name]"] = ""; dt[f"columns[{i}][searchable]"] = "true"
    dt[f"columns[{i}][orderable]"] = "true"; dt[f"columns[{i}][search][value]"] = ""; dt[f"columns[{i}][search][regex]"] = "false"
get("mla_min.json", "/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport", {**base, "draw": 1, "start": 0, "length": 100})
get("mla_full.json", "/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport", {**base, **dt})
get("mla_full_2025.json", "/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport", {**base, **dt, "FinancialYear": 2025})
get("mla_dist344.json", "/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport", {**base, **dt, "DistrictId": 344})
get("mla_big.json", "/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport", {**base, **dt, "length": 20000})
get("mlalist_344.json", "/Masters/Ajax/GetMLAList", {"districtId": 344})
get("conslist_344.json", "/Masters/Ajax/GetConstituencyList", {"districtId": 344})
try:
    log.append({"seen_from_country": s.get("https://ipinfo.io/country", timeout=20).text.strip()})
except Exception as e:
    log.append({"seen_from_country": "?"})
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1)
