"""UP MLALADS (mlaladsup.in): call the public report endpoints behind the work pages.
Body format as the site sends it: "{'obj':" + JSON + "}". -> raw24/"""
import json, os
import requests, urllib3
urllib3.disable_warnings()
OUT = "raw24"; os.makedirs(OUT, exist_ok=True)
B = "https://mlaladsup.in"
s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)",
                  "Content-Type": "application/json; charset=utf-8", "X-Requested-With": "XMLHttpRequest",
                  "Referer": B + "/main/MLAWiseWorkCounts"})
log = []
def post(name, path, obj):
    try:
        r = s.post(B + path, data="{'obj':" + json.dumps(obj, ensure_ascii=False) + "}", timeout=120, verify=False)
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(r.text)
        log.append({"file": name, "path": path, "obj": obj, "status": r.status_code, "bytes": len(r.text), "head": r.text[:400]})
        return r.text
    except Exception as e:
        log.append({"file": name, "path": path, "obj": obj, "error": str(e)[:200]})
        return ""
try:
    r = s.get(B + "/robots.txt", timeout=30, verify=False)
    open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8").write(r.text)
    log.append({"file": "robots.txt", "status": r.status_code, "head": r.text[:300]})
except Exception as e:
    log.append({"file": "robots.txt", "error": str(e)[:200]})
s.get(B + "/main/MLAWiseWorkCounts", timeout=60, verify=False)
years = post("years.json", "/DropdownBinder/fillDropdown", {"optMode": "bindYear"})
post("seattypes.json", "/DropdownBinder/fillDropdown", {"optMode": "bindSeatType"})
post("districts.json", "/DropdownBinder/fillDropdown", {"optMode": "bindAllDistrict"})
mlas = post("mlas.json", "/DropdownBinder/fillDropdown", {"optMode": "bindMLA", "seatTypeId": "1"})
try:
    yl = json.loads(years)
except Exception:
    yl = []
yid = str(yl[0]["id"]) if yl else "3"
post("mla_counts.json", "/Main/DistrictWiseWorkCounts", {"optMode": "getWorkMLAWisePhysical", "seatId": "-1", "seatTypeId": "1", "yearId": yid})
post("mla_counts_all.json", "/Main/DistrictWiseWorkCounts", {"optMode": "getWorkMLAWisePhysical", "seatId": "-1", "seatTypeId": "1", "yearId": "-1"})
post("district_counts.json", "/Main/DistrictWiseWorkCounts", {"optMode": "getWorkDistrictWisePhysical", "districtId": "-1", "yearId": yid})
try:
    ml = json.loads(mlas)
except Exception:
    ml = []
seat = str(ml[0]["id"]) if ml else "1"
for at in ("-1", "0", "1", "2"):
    post(f"work_details_{at}.json", "/Main/getNikayDistrictWise",
         {"optMode": "getWorkDetails", "applicationType": at, "yearId": yid, "seatId": seat, "seatTypeId": "1", "districtId": "-1"})
post("mla_profile.json", "/Main/DistrictWiseWorkCounts", {"optMode": "mlaProfile"})
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
