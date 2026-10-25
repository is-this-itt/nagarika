"""India Data Portal (ISB): find the UDISE 'Basic Details of Schools' file and save its
metadata and the first part of the CSV. -> raw18/"""
import json, os
import requests

OUT = "raw18"; os.makedirs(OUT, exist_ok=True)
s = requests.Session(); s.headers["User-Agent"] = "nagarika-probe (+https://github.com/is-this-itt/nagarika)"
log = []
for host in ("https://indiadataportal.com", "https://ckandev.indiadataportal.com", "https://ckan.indiadataportal.com"):
    for path in ("/api/3/action/package_show?id=udise", "/api/3/action/resource_show?id=457fddf1-982f-4c85-855d-5095578accc1",
                 "/api/3/action/package_search?q=udise&rows=20"):
        try:
            r = s.get(host + path, timeout=60)
            fn = f"{len(log):02d}.json"
            open(os.path.join(OUT, fn), "w", encoding="utf-8").write(r.text)
            log.append({"url": host + path, "status": r.status_code, "bytes": len(r.text), "file": fn})
        except Exception as e:
            log.append({"url": host + path, "error": str(e)[:200]})
urls = set()
for x in log:
    if x.get("status") == 200:
        try:
            res = json.load(open(os.path.join(OUT, x["file"]), encoding="utf-8"))["result"]
        except Exception:
            continue
        items = res.get("results", [res]) if isinstance(res, dict) else []
        for it in items:
            for rr in it.get("resources", [it]):
                if rr.get("url"):
                    urls.add((rr.get("name"), rr["url"], rr.get("size")))
log.append({"resource_urls": sorted(map(list, urls))[:80]})
for name, url, size in sorted(urls):
    if "457fddf1" in url or (name and "Basic Details" in name):
        try:
            r = s.get(url, timeout=120, stream=True, headers={"Range": "bytes=0-300000"})
            chunk = r.raw.read(300000)
            open(os.path.join(OUT, "schools_head.csv"), "wb").write(chunk)
            log.append({"sample": url, "status": r.status_code, "headers": dict(r.headers)})
        except Exception as e:
            log.append({"sample": url, "error": str(e)[:200]})
        break
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1)
