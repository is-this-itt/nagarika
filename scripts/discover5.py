"""Mumbai: read every active MCGM tender on mahatenders and save the key fields."""
import csv, json, os, re, sys, time, traceback, urllib.parse
sys.path.insert(0, "scripts")
os.makedirs("raw9", exist_ok=True)
log = []
try:
    import requests
    import gepnic_copy as g
    from common import is_road_work
    base = "https://mahatenders.gov.in/nicgep/app"
    s = requests.Session(); s.headers.update(g.UA)
    page = s.get(base + "?page=FrontEndTendersByOrganisation&service=page", timeout=60).text
    orgs = g.org_links(page)
    json.dump([o for o, _ in orgs], open("raw9/orgs.json", "w"), indent=0)
    href = next((h for o, h in orgs if o == "Municipal Corporation of Greater Mumbai"), None)
    log.append(f"MCGM link found: {bool(href)}")
    lst = s.get(urllib.parse.urljoin(base, href), timeout=60).text
    open("raw9/mcgm_list.html", "w").write(lst)
    rows = g.tender_rows(lst)
    log.append(f"MCGM rows {len(rows)}")
    out = []
    for tid, link in rows:
        try:
            f = g.detail_fields(s.get(urllib.parse.urljoin(base, link), timeout=60).text)
        except Exception as e:
            log.append(f"ERR {tid} {e!r}")
            continue
        out.append({"tid": tid, "chain": f.get("Organisation Chain", ""), "title": f.get("Title", ""),
                    "desc": f.get("Work Description", ""), "location": f.get("Location", ""),
                    "category": f.get("Product Category", ""), "subcat": f.get("Sub category", ""),
                    "value": f.get("Tender Value in ₹", ""), "period": f.get("Period Of Work(Days)", ""),
                    "road": is_road_work(f.get("Work Description", ""), f.get("Title", ""))})
        time.sleep(0.4)
    with open("raw9/mcgm.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)
    log.append(f"read {len(out)}, road {sum(r['road'] for r in out)}")
except Exception:
    log.append("fatal " + traceback.format_exc())
json.dump(log, open("raw9/_log.json", "w"), indent=0)
