"""Download selected OpenCity files on Bengaluru waste and traffic (official documents and
BTP/BBMP datasets) for study. -> raw28/"""
import json, os, requests
OUT = "raw28"; os.makedirs(OUT, exist_ok=True)
H = {"User-Agent": "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"}
d = json.load(open("raw27/opencity.json", encoding="utf-8"))
want = {"bengaluru-swm-fee-circular-2025": None, "solid-waste-management-rules-2026": None, "bengaluru-traffic-violations-data": None,
        "bengaluru-road-crashes-data": None, "bbmp-swm-infrastructure": None, "bengaluru-public-toilets": ["CSV"],
        "gba-parking-rules-2026-draft": None, "bbmp-solid-waste-management-data": ["CSV"], "bengaluru-traffic-police-jurisdictions": None,
        "bbmp-waste-list-of-private-vendors": None, "bbmp-waste-service-providers-scope-of-services": None, "bengaluru-parking-policy-2-0": ["PDF"]}
log = []
for name, fmts in want.items():
    p = d.get(name)
    if not p:
        log.append({"dataset": name, "error": "missing"}); continue
    for i, r in enumerate(p["resources"][:12]):
        if fmts and (r.get("format") or "").upper() not in fmts:
            continue
        ext = (r.get("format") or "bin").lower()
        fn = f"{name}__{i}.{ext}"
        try:
            x = requests.get(r["url"], headers=H, timeout=120)
            if len(x.content) > 25_000_000:
                log.append({"file": fn, "skipped": len(x.content)}); continue
            open(os.path.join(OUT, fn), "wb").write(x.content)
            log.append({"file": fn, "name": r.get("name"), "url": r["url"], "status": x.status_code, "bytes": len(x.content)})
        except Exception as e:
            log.append({"file": fn, "error": str(e)[:200]})
json.dump(log, open(f"{OUT}/_log.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
