"""UP and Delhi assembly constituency lists (number, English name, district) from Wikipedia,
to name the UP MLALADS works, plus one Delhi MLALAD sanction-order page. -> raw25/"""
import json, os, requests, urllib3
urllib3.disable_warnings()
OUT = "raw25"; os.makedirs(OUT, exist_ok=True)
H = {"User-Agent": "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"}
log = []
def get(name, url, **kw):
    try:
        r = requests.get(url, headers=H, timeout=90, verify=False, **kw)
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(r.text)
        log.append({"file": name, "url": r.url, "status": r.status_code, "bytes": len(r.text)})
    except Exception as e:
        log.append({"file": name, "url": url, "error": str(e)[:200]})
API = "https://en.wikipedia.org/w/api.php"
for name, page in [("up_ac.json", "List of constituencies of the Uttar Pradesh Legislative Assembly"),
                   ("delhi_ac.json", "List of constituencies of the Delhi Legislative Assembly")]:
    get(name, API, params={"action": "parse", "page": page, "prop": "wikitext", "format": "json", "redirects": 1})
D = "https://udd.delhi.gov.in"
get("delhi_list0.html", D + "/mlalad-scheme")
get("delhi_node.html", D + "/ud/ac41-5062-5072-17-09-2026")
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1)
