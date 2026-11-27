"""The open data API: small JSON files under _site/api/v1/, one per place.

The site's own files are shaped for pages (works.json is the whole country in one file).
These are shaped for programs, including the MCP server in mcp/: each file is small
enough to fetch and read in a few milliseconds, and every record carries its official
source link and the date it was last checked. The files are documented in
_site/api/v1/datasets.json, which build() writes from the data actually present.
"""
import csv
import glob
import json
import os
import re
from urllib.parse import quote

from common import DATA

VERSION = "v1"
SITE = "https://is-this-itt.github.io/nagarika/"
# Lists longer than this keep only the newest works; the full set is in the CSV download.
MAX_LIST = 500
NO_PLACE = "place-not-given"


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def num(v):
    return int(v) if v and str(v).isdigit() else None


def dump(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(obj, open(path, "w"), separators=(",", ":"), ensure_ascii=False)


def road(r):
    return {"id": r["id"], "title": r["title"], "agency": r["agency"], "office": r["office"],
            "contractor": r["contractor"], "place": r["place"], "pincode": r["pincode"],
            "city": r["city"], "wards": r["ward_ids"].split(";") if r["ward_ids"] else [],
            "ward_match": r["ward_match"], "sanctioned_cost": num(r["sanctioned_cost"]),
            "cost_basis": r["cost_basis"], "amount_paid": num(r["amount_paid"]),
            "published_date": r["published_date"], "start_date": r["start_date"], "deadline": r["deadline"],
            "deadline_basis": r["deadline_basis"], "status": r["status"], "flag": r["flag"],
            "source_url": r["source_url"], "source_note": r["source_note"], "last_checked": r["last_checked"]}


def table(objs):
    """Lists of records are stored as {"fields": [...], "rows": [[...], ...]} to keep files small."""
    fields = list(objs[0]) if objs else []
    return {"fields": fields, "rows": [[o[f] for f in fields] for o in objs]}


def summary(rows):
    return {"works": len(rows), "flagged": sum(1 for r in rows if r["flag"]),
            "sanctioned_cost": sum(num(r["sanctioned_cost"]) or 0 for r in rows),
            "amount_paid": sum(num(r["amount_paid"]) or 0 for r in rows),
            "last_checked": max((r["last_checked"] for r in rows), default="")}


def work_list(rows):
    """Newest first, at most MAX_LIST, and say so when cut."""
    return {**summary(rows), "shown": min(len(rows), MAX_LIST), "items": table([road(r) for r in rows[:MAX_LIST]])}


def build_roads(api, rows, meta, ward_index):
    """roads/<state>.json, roads/<state>/<place>.json, roads/city/<city>.json, roads/city/<city>/<ward>.json.
    rows are newest first."""
    by_state = {}
    for r in rows:
        by_state.setdefault(r["state"] or "Unknown", []).append(r)
    states = []
    for st, srows in sorted(by_state.items()):
        places = {}
        for r in srows:
            places.setdefault(slug(r["place"]) or NO_PLACE, []).append(r)
        pl = []
        for ps, prs in sorted(places.items()):
            name = prs[0]["place"] or "Place not given by the source"
            dump(os.path.join(api, "roads", slug(st), f"{ps}.json"),
                 {"state": st, "place": name, "slug": ps, **work_list(prs)})
            pl.append({"slug": ps, "name": name, "works": len(prs)})
        pl.sort(key=lambda p: -p["works"])
        dump(os.path.join(api, "roads", f"{slug(st)}.json"),
             {"state": st, "slug": slug(st), **summary(srows), "places": pl,
              "newest": table([road(r) for r in srows[:50]])})
        states.append({"state": st, "slug": slug(st), "works": len(srows)})
    for c in meta["cities"]:
        crows = [r for r in rows if r["city"] == c["slug"]]
        wards = []
        for key, no, name, zone, assembly, _pc in ward_index.get(c["slug"], []):
            wrows = [r for r in crows if key in r["ward_ids"].split(";")]
            dump(os.path.join(api, "roads", "city", c["slug"], f"{key}.json"),
                 {"city": c["name"], "ward": key, "ward_no": no, "ward_name": name, "zone": zone,
                  "assembly_constituency": assembly, **work_list(wrows)})
            wards.append({"key": key, "no": no, "name": name, "zone": zone, "works": len(wrows)})
        dump(os.path.join(api, "roads", "city", f"{c['slug']}.json"),
             {"city": c["name"], "slug": c["slug"], "state": c["state"], **summary(crows),
              "not_matched_to_a_ward": sum(1 for r in crows if not r["ward_ids"]), "wards": wards,
              "newest": table([road(r) for r in crows[:50]])})
    pins = {}
    for r in rows:
        if re.fullmatch(r"\d{6}", r["pincode"] or ""):
            pins.setdefault(r["pincode"], []).append(r)
    for pin, prs in pins.items():
        dump(os.path.join(api, "roads", "pin", f"{pin}.json"), {"pincode": pin, **work_list(prs)})
    dump(os.path.join(api, "roads", "index.json"),
         {"states": states, "cities": [{"slug": c["slug"], "name": c["name"], "state": c["state"],
                                        "works": c["works"], "wards": c["wards"]} for c in meta["cities"]]})
    return states


MP_FIELDS = ["id", "category", "activity", "description",
             "implementing_agency", "letter_no", "recommended_date", "recommended_amount", "sanction_date",
             "sanction_amount", "stage", "completed_date", "actual_amount", "last_checked"]


def build_mp(api):
    """mp/<state>/<constituency id>.json: every MPLADS work in one Lok Sabha constituency."""
    for path in sorted(glob.glob(os.path.join(DATA, "mplads", "*.csv"))):
        by_cons = {}
        for r in csv.DictReader(open(path, newline="", encoding="utf-8")):
            by_cons.setdefault(r["constituency_id"], []).append(r)
        st = os.path.basename(path)[:-4]
        for cid, rs in by_cons.items():
            rs.sort(key=lambda r: r["recommended_date"] or r["sanction_date"], reverse=True)
            items = []
            for r in rs:
                o = {k: r[k] for k in MP_FIELDS}
                for k in ("recommended_amount", "sanction_amount", "actual_amount"):
                    o[k] = num(r[k])
                items.append(o)
            dump(os.path.join(api, "mp", st, f"{cid}.json"),
                 {"state": rs[0]["state"], "constituency": rs[0]["constituency"], "constituency_id": cid,
                  "mp_name": rs[0]["mp_name"], "tenure": rs[0]["tenure"], "works": len(items), "items": table(items)})


def build_places(api, rows, meta, ward_index, mp_index, mla_index, edu_states):
    """Everything a person might type, each with the tool and arguments that answer it."""
    out = []
    add = lambda kind, label, detail, tool, args, link: out.append([kind, label, detail, tool, args, SITE + link])
    for c in meta["cities"]:
        add("City", c["name"], c["state"], "get_road_works", {"city": c["slug"]}, f"#/city/{c['slug']}")
    for city, wards in ward_index.items():
        cname = next(c["name"] for c in meta["cities"] if c["slug"] == city)
        for key, no, name, zone, assembly, _pc in wards:
            detail = ", ".join(x for x in [f"ward {no}", zone.replace(" City Corporation", ""), cname,
                                           f"assembly constituency {assembly}" if assembly else ""] if x)
            add("Ward", name, detail, "get_road_works", {"city": city, "ward": key}, f"#/city/{city}/ward/{key}")
    counts = {}
    for r in rows:
        counts.setdefault(r["state"] or "Unknown", {}).setdefault(r["place"], 0)
        counts[r["state"] or "Unknown"][r["place"]] += 1
    for st, places in sorted(counts.items()):
        add("State", st, "Road works", "get_road_works", {"state": slug(st)}, f"#/state/{quote(st)}")
        for p, n in sorted(places.items()):
            if p:
                add("Town or district", p, f"{st} · {n} road works", "get_road_works",
                    {"state": slug(st), "place": slug(p)}, f"#/state/{quote(st)}?q={quote(p)}")
    pins = {}
    for r in rows:
        if re.fullmatch(r"\d{6}", r["pincode"] or "") and r["place"]:
            pins[r["pincode"]] = (r["state"], r["place"])
    for pin, (st, p) in sorted(pins.items()):
        add("PIN code", pin, f"{p}, {st}", "get_road_works", {"pincode": pin},
            f"#/search?q={pin}")
    for s in mp_index:
        add("State", s["state"], "MP funds (MPLADS)", "get_mp_funds", {"state": s["slug"]}, f"#/mp/{s['slug']}")
        for c in s["constituencies"]:
            mp = c["mp"].title() if c["mp"].isupper() else c["mp"]
            add("Lok Sabha constituency", c["name"], f"{s['state']} · MP: {mp}", "get_mp_funds",
                {"state": s["slug"], "constituency": c["id"]}, f"#/mp/{s['slug']}/{c['id']}")
    for s in mla_index:
        add("State", s["state"], "MLA funds", "get_mla_funds", {"state": s["slug"]}, f"#/mla/{s['slug']}")
        for c in s["constituencies"]:
            add("Assembly constituency", c["name"], f"{s['state']} · {c['district']} district"
                + (f" · MLA: {c['mla']}" if c.get("mla") else ""), "get_mla_funds",
                {"state": s["slug"], "constituency": c["id"]}, f"#/mla/{s['slug']}/{c['id']}")
    for st in edu_states:
        add("State", st, "Education help: RTE seats, scholarships", "get_education_help", {"state": slug(st)},
            f"#/guides/education/{slug(st)}")
    dump(os.path.join(api, "places.json"), {"fields": ["kind", "label", "detail", "tool", "args", "link"], "rows": out})


def build_catalogue(api, meta, road_states, mp_index, mla_index, edu_states):
    """datasets.json: what we hold, where it comes from, how fresh it is, and what is missing."""
    base = SITE + "api/v1/"
    data = SITE + "data/"
    ds = [{
        "id": "road_works", "title": "Road works", "question": "What is the government doing here?",
        "about": "Tenders, work orders and payments for roads, footpaths, drains, culverts and flyovers, "
                 "from state and central e-procurement portals and BBMP's accounts. Ward level for the cities listed.",
        "coverage": {"works": meta["total"], "states": len(road_states), "cities_with_wards": [c["name"] for c in meta["cities"]],
                     "by_source": meta["sources"]},
        "last_checked": meta["last_checked"],
        "sources": ["Karnataka Public Procurement Portal (kppp.karnataka.gov.in)",
                    "NIC GePNIC portals: eprocure.gov.in and state portals",
                    "BBMP bill payments (accounts.bbmp.gov.in), via OpenCity"],
        "gaps": ["Award results (contractor, contract value) on GePNIC portals sit behind a captcha and are not collected.",
                 "Finish dates are often estimated (bid opening + period of work); deadline_basis says which.",
                 "GeM, PMGSY and data.gov.in are not collected yet."],
        "tool": "get_road_works",
        "files": {"index": base + "roads/index.json", "state": base + "roads/{state}.json",
                  "place": base + "roads/{state}/{place}.json", "city": base + "roads/city/{city}.json",
                  "ward": base + "roads/city/{city}/{ward}.json", "pincode": base + "roads/pin/{pincode}.json", "download_csv": data + "works.csv"},
    }]
    if mp_index:
        ds.append({
            "id": "mp_funds", "title": "MP funds (MPLADS)", "question": "What is the government doing here?",
            "about": "Works recommended by Lok Sabha MPs from their ₹5 crore a year local area fund: amounts recommended, "
                     "sanctioned and spent, stage, implementing agency.",
            "coverage": {"works": sum(s["works"] for s in mp_index), "states": len(mp_index),
                         "constituencies": sum(len(s["constituencies"]) for s in mp_index),
                         "tenure": mp_index[0]["tenure"]},
            "last_checked": max(s["last_checked"] for s in mp_index),
            "sources": ["eSAKSHI MPLADS portal, Ministry of Statistics and Programme Implementation (mplads.mospi.gov.in)"],
            "gaps": ["Rajya Sabha MPs are not included yet."],
            "tool": "get_mp_funds",
            "files": {"index": data + "mplads_index.json", "constituency": base + "mp/{state}/{constituency_id}.json",
                      "download_csv": data + "mplads.csv"},
        })
    if mla_index:
        ds.append({
            "id": "mla_funds", "title": "MLA funds (MLALADS)", "question": "What is the government doing here?",
            "about": "Works chosen by MLAs from their state's local area development fund.",
            "coverage": {"works": sum(s["works"] for s in mla_index), "states": [s["state"] for s in mla_index],
                         "constituencies": sum(len(s["constituencies"]) for s in mla_index)},
            "last_checked": max(s["last_checked"] for s in mla_index),
            "sources": ["Odisha: mlalads.odisha.gov.in (Planning & Convergence Department)",
                        "Uttar Pradesh: mlaladsup.in"],
            "gaps": ["Only the states listed. Delhi publishes sanction orders only as PDFs; Madhya Pradesh needs a login; "
                     "other states' portals are not collected yet.",
                     "Uttar Pradesh gives estimated cost and physical progress, not amounts sanctioned or spent, "
                     "and its work details are in Hindi."],
            "tool": "get_mla_funds",
            "files": {"index": data + "mlalads_index.json", "constituency": data + "mlalads/{state}/{constituency}.json"},
        })
    if edu_states:
        ds.append({
            "id": "education_help", "title": "Help for children's education",
            "question": "What is the government offering, and to whom?",
            "about": "Each state's RTE 25% free-seat admission portal and scholarship portals, plus the National "
                     "Scholarship Portal: whether it opened when checked, helplines, notices and last dates.",
            "coverage": {"states": len(edu_states)},
            "sources": ["Official state RTE and scholarship portals; scholarships.gov.in"],
            "gaps": ["Last dates are read only where the portal shows them as text (NSP, Karnataka SSP)."],
            "tool": "get_education_help",
            "files": {"all": data + "education.json"},
        })
    ds.append({
        "id": "complaint_channels", "title": "Where to complain", "question": "Who is responsible, and how do I reach them?",
        "about": "Official complaint channels by city and topic, each with where it was confirmed and when.",
        "coverage": {"keys": sorted(json.load(open(os.path.join(DATA, "complaints.json"), encoding="utf-8")))},
        "gaps": ["Only Bengaluru, Chennai and Mumbai have city channels so far."],
        "tool": "where_to_complain",
        "files": {"all": data + "complaints.json"},
    })
    dump(os.path.join(api, "datasets.json"),
         {"name": "Nagarika open civic data", "site": SITE, "built": meta["built"],
          "licence": {"data": "ODbL 1.0 (credit \"Nagarika contributors\")", "url": data + "LICENSE.md"},
          "places": base + "places.json", "datasets": ds})


def build(out, rows, meta, ward_index, mp_index, mla_index, edu_states):
    api = os.path.join(out, "api", VERSION)
    road_states = build_roads(api, rows, meta, ward_index)
    build_mp(api)
    build_places(api, rows, meta, ward_index, mp_index, mla_index, edu_states)
    build_catalogue(api, meta, road_states, mp_index, mla_index, edu_states)
