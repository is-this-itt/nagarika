"""MPLADS eSAKSHI pass 2: table script + summary endpoint responses."""
import os, json
import requests

B = "https://mplads.mospi.gov.in"
os.makedirs("raw6", exist_ok=True)
s = requests.Session()
UA = "Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36"
s.headers.update({"User-Agent": UA, "X-Client-UA": UA, "Referer": B + "/digigov/dashboard.html", "Origin": B})
log = open("raw6/_index.txt", "w")

def save(name, r):
    open(f"raw6/{name}", "wb").write(r.content)
    log.write(f"{r.status_code} {len(r.content)} {name} {r.request.method} {r.url} {r.request.body!r}\n"); log.flush()

def get(name, path):
    try: save(name, s.get(B + path, timeout=90))
    except Exception as e: log.write(f"ERR {name} {e!r}\n")

def post(name, path, body):
    try: save(name, s.post(B + "/rest/PreLoginDashboardData/" + path, json=body, timeout=90))
    except Exception as e: log.write(f"ERR {name} {e!r}\n")

get("dashboard.html", "/digigov/dashboard.html")
for js in ["poptable.js", "graph.js", "preLoginDashboard.js"]:
    get("js_" + js, "/libs/simplegrid/" + js)
post("tenure.json", "getTenureData", {"uname": "0,0,0,2"})
post("tiles_ls.json", "getTilesData", {"uname": "0,0,0,2"})
post("tiles_rs.json", "getTilesData", {"uname": "0,0,0,1"})
post("total_tiles.json", "getTotalTilesData", {"uname": "0,0,0,2"})
post("states.json", "getStateData", {})
try:
    states = json.load(open("raw6/states.json"))
    ka = next(x["STATE_ID"] for x in states if "KARNATAKA" in str(x.get("STATE_NAME", "")).upper())
    post("const_ka.json", "getConstituencyData", {"id": ka})
    tenure = json.load(open("raw6/tenure.json"))
    log.write(f"tenure sample {json.dumps(tenure)[:300]}\n")
except Exception as e:
    log.write(f"ERR chain {e!r}\n")
