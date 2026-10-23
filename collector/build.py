"""Build the static site into _site/ from site/ and data/.

Derived fields (overdue flags, ward totals) are computed here, not stored, so they
always reflect today's date.
"""
import csv
import datetime as dt
import re
import json
import os
import shutil

from common import DATA, FIELDS, ROOT, WORKS_CSV, load_works
from places import BENGALURU_AC_TO_PC, CITIES, load_wards

OUT = os.path.join(ROOT, "_site")
DONE = ("complet", "cancel", "recalled", "retendered", "no bids", "bill paid")


def flag(r, today):
    """overdue: official deadline passed; past_estimate: estimated finish passed."""
    if not r["deadline"] or r["deadline"] >= today:
        return ""
    if any(w in r["status"].lower() for w in DONE):
        return ""
    return "overdue" if r["deadline_basis"] == "official" else "past_estimate"


def num(v):
    return int(v) if v and v.isdigit() else 0


def main():
    today = dt.date.today().isoformat()
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(os.path.join(ROOT, "site"), OUT)
    # New file names on every build, so phones never keep running an old script.
    stamp = dt.datetime.now().strftime("%Y%m%d%H%M%S")
    index = os.path.join(OUT, "index.html")
    html = open(index).read().replace('src="app.js"', f'src="app.js?v={stamp}"').replace('href="style.css"', f'href="style.css?v={stamp}"')
    open(index, "w").write(html)
    os.makedirs(os.path.join(OUT, "data", "wards"), exist_ok=True)

    works = load_works()
    rows = []
    for r in works.values():
        r = dict(r)
        r["flag"] = flag(r, today)
        rows.append(r)
    rows.sort(key=lambda r: (r["published_date"] or r["first_seen"]), reverse=True)

    # Compact JSON for the site: only the fields pages show.
    keep = [f for f in FIELDS if f not in ("state_lgd",)] + ["flag"]
    json.dump({"fields": keep, "rows": [[r[k] for k in keep] for r in rows]},
              open(os.path.join(OUT, "data", "works.json"), "w"), separators=(",", ":"), ensure_ascii=False)

    cities, ward_index = [], {}
    for slug, c in CITIES.items():
        wards = load_wards(slug)
        ward_index[slug] = [[w["ward_key"], w["ward_no"], w["ward_name"], w.get("zone", ""), w.get("assembly", ""),
                             ":".join(BENGALURU_AC_TO_PC.get(w.get("assembly", ""), ())) if slug == "bengaluru" else ""]
                            for w in wards]
        cw = [r for r in rows if r["city"] == slug]
        src = os.path.join(DATA, "boundaries", f"{slug}.geojson")
        if os.path.exists(src):
            shutil.copy(src, os.path.join(OUT, "data", "wards", f"{slug}.geojson"))
        cities.append({**c, "slug": slug, "wards": len(wards), "works": len(cw),
                       "unmatched": sum(1 for r in cw if not r["ward_ids"]),
                       "overdue": sum(1 for r in cw if r["flag"]),
                       "cost": sum(num(r["sanctioned_cost"]) for r in cw),
                       "paid": sum(num(r["amount_paid"]) for r in cw)})
    states = {}
    for r in rows:
        s = states.setdefault(r["state"] or "Unknown", {"works": 0, "flagged": 0})
        s["works"] += 1
        s["flagged"] += bool(r["flag"])
    sources = {}
    for r in rows:
        sources[r["source"]] = sources.get(r["source"], 0) + 1
    meta = {"built": today, "total": len(rows), "cities": cities, "states": states, "sources": sources,
            "last_checked": max((r["last_checked"] for r in rows), default="")}
    json.dump(meta, open(os.path.join(OUT, "data", "meta.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(ward_index, open(os.path.join(OUT, "data", "wards.json"), "w"), separators=(",", ":"), ensure_ascii=False)

    shutil.copy(WORKS_CSV, os.path.join(OUT, "data", "works.csv")) if os.path.exists(WORKS_CSV) else None
    mp_index = build_mplads()
    build_places(meta, ward_index, rows, mp_index)
    shutil.copy(os.path.join(DATA, "LICENSE.md"), os.path.join(OUT, "data", "LICENSE.md"))
    print(f"built _site with {len(rows)} works")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def build_mplads():
    """Per-state MPLADS files and an index of states and constituencies."""
    import glob
    paths = sorted(glob.glob(os.path.join(DATA, "mplads", "*.csv")))
    if not paths:
        return []
    os.makedirs(os.path.join(OUT, "data", "mplads"), exist_ok=True)
    rows = []
    for path in paths:
        rows += list(csv.DictReader(open(path, newline="", encoding="utf-8")))
        shutil.copy(path, os.path.join(OUT, "data", "mplads", os.path.basename(path)))
    # One combined download as well (the site may serve files larger than the repo allows).
    with open(os.path.join(OUT, "data", "mplads.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    keep = ["id", "constituency_id", "constituency", "mp_name", "category", "activity", "description",
            "implementing_agency", "letter_no", "recommended_date", "recommended_amount", "sanction_date",
            "sanction_amount", "stage", "completed_date", "actual_amount", "tenure", "last_checked"]
    num = lambda v: int(v) if v and v.isdigit() else 0
    index = []
    for state in sorted({r["state"] for r in rows}):
        sr = [r for r in rows if r["state"] == state]
        sr.sort(key=lambda r: r["recommended_date"] or r["sanction_date"], reverse=True)
        json.dump({"fields": keep, "rows": [[r[k] for k in keep] for r in sr]},
                  open(os.path.join(OUT, "data", "mplads", f"{slug(state)}.json"), "w"),
                  separators=(",", ":"), ensure_ascii=False)
        cons = {}
        for r in sr:
            c = cons.setdefault(r["constituency_id"], {"id": r["constituency_id"], "name": r["constituency"],
                                                       "mp": r["mp_name"], "works": 0, "recommended": 0,
                                                       "sanctioned": 0, "spent": 0, "completed": 0})
            c["works"] += 1
            c["recommended"] += num(r["recommended_amount"])
            c["sanctioned"] += num(r["sanction_amount"])
            c["spent"] += num(r["actual_amount"])
            c["completed"] += r["stage"] == "Work Completed"
        cl = sorted(cons.values(), key=lambda c: c["name"])
        index.append({"state": state, "slug": slug(state), "works": len(sr),
                      "sanctioned": sum(c["sanctioned"] for c in cl), "spent": sum(c["spent"] for c in cl),
                      "completed": sum(c["completed"] for c in cl), "constituencies": cl,
                      "tenure": sr[0]["tenure"] if sr else "", "last_checked": max(r["last_checked"] for r in sr)})
    json.dump(index, open(os.path.join(OUT, "data", "mplads_index.json"), "w"), separators=(",", ":"), ensure_ascii=False)
    return index


def build_places(meta, ward_index, rows, mp_index):
    """One small list of everything a person might type: places, constituencies, MPs, PIN codes.
    Each entry: [kind, label, detail, link, extra search words]."""
    out = []
    for c in meta["cities"]:
        out.append(["City", c["name"], c["state"], f"#/city/{c['slug']}", ""])
    for city, wards in ward_index.items():
        cname = next(c["name"] for c in meta["cities"] if c["slug"] == city)
        for key, no, name, zone, assembly, pc in wards:
            detail = ", ".join(x for x in [f"ward {no}", zone.replace(" City Corporation", ""), cname] if x)
            out.append(["Ward", name, detail, f"#/city/{city}/ward/{key}", f"{assembly} {no}"])
        if city == "bengaluru":
            for ac in sorted({w[4] for w in wards if w[4]}):
                out.append(["Assembly constituency", ac, "Bengaluru", f"#/search?q={ac}", ""])
    for st in sorted(meta["states"]):
        out.append(["State", st, "Road works", f"#/state/{st}", ""])
    for s in mp_index:
        out.append(["State", s["state"], "MP funds (MPLADS)", f"#/mp/{s['slug']}", ""])
        for c in s["constituencies"]:
            mp = c["mp"].title() if c["mp"].isupper() else c["mp"]
            out.append(["Lok Sabha constituency", c["name"], f"{s['state']} · MP: {mp}",
                        f"#/mp/{s['slug']}/{c['id']}", mp])
    places = {}
    for r in rows:
        if r["place"] and not r["city"]:
            places.setdefault((r["place"], r["state"]), 0)
            places[(r["place"], r["state"])] += 1
    for (p, st), n in places.items():
        out.append(["Town or district", p, f"{st} · {n} road works", f"#/state/{st}?q={p}", ""])
    pins = {}
    for r in rows:
        if re.fullmatch(r"\d{6}", r["pincode"] or ""):
            pins[r["pincode"]] = r["place"] or r["state"]
    for pin, where in pins.items():
        out.append(["PIN code", pin, where, f"#/search?q={pin}", ""])
    json.dump(out, open(os.path.join(OUT, "data", "places.json"), "w"), separators=(",", ":"), ensure_ascii=False)


if __name__ == "__main__":
    main()
