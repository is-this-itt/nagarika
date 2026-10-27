"""MLA local area development funds (MLALADS), from state portals that only answer
requests from India. Run by the "India-only sources" workflow on the self-hosted
runner (see docs/india-runner.md), not by the normal collection on GitHub's servers.

Odisha: mlalads.odisha.gov.in publishes every current-year project through the public
endpoint behind its landing page (/Masters/Ajax/GetProjectFinancialList): project code,
year, district, constituency, category, department, component (General / Road /
Education), sanctioned and spent amounts, time allowed and status. No login.
The MLA-wise report (/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport, a DataTables
endpoint, one financial year at a time) adds the MLA's name, the recommendation letter and
date, the sanction date, the implementing agency, and the block and village.

Uttar Pradesh: mlaladsup.in answers public POST requests behind its MLA-wise work pages
(/Main/DistrictWiseWorkCounts for counts per MLA and year, /Main/getNikayDistrictWise for
the works of one MLA in one year). Fields are in Hindi: work id, description, type,
district, block or urban body, ward or gram panchayat, year, recommendation date, the
implementing agency's estimated cost (in lakh) and physical progress. Constituencies are
named by assembly number, matched to English names in data/mlalads/up_constituencies.json.

Delhi: the Urban Development Department lists MLALAD sanction orders as PDF files at
udd.delhi.gov.in/mlalad-scheme, ten to a page, titled "AC41-(5062-5072) 17-09-2026":
assembly constituency number, the range of sanction order numbers in the file, and the
date. We index those titles (data/mlalads/delhi_orders.json); the works themselves are
only in the PDFs.

Output: one CSV per state in data/mlalads/. Amounts are in rupees.
"""
import csv
import json
import os
import re
import sys
import time

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import DATA, today  # noqa: E402

UA = "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"
CSV_DIR = os.path.join(DATA, "mlalads")
FIELDS = ["id", "project_code", "state", "financial_year", "district", "constituency", "component",
          "category", "department", "name", "sanction_amount", "spent_amount", "days_allowed",
          "status", "mla", "recommended_amount", "estimated_amount", "progress", "letter_no", "recommended_on", "sanctioned_on", "agency", "block", "village",
          "source_url", "first_seen", "last_checked"]
REPORT_COLS = ["rowNumber", "financialYear", "districtName", "constituencyName", "fullName", "letterNo",
               "strRecommendationDate", "recommendationAmount", "projectId", "workDescription", "workStatus"]
ODISHA = "https://mlalads.odisha.gov.in"


def get_json(url, params=None):
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers={"User-Agent": UA, "X-Requested-With": "XMLHttpRequest"},
                             timeout=300, verify=False)
            if r.status_code == 200:
                return r.json()
        except (requests.RequestException, ValueError):
            pass
        time.sleep(10 * (attempt + 1))
    return None


def rupees(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return ""
    return str(int(round(f))) if f > 0 else ""


def day(v):
    """'2026-06-21T10:58:58' -> '2026-06-21'; the portal uses 0001-01-01 for 'none'."""
    v = (v or "")[:10]
    return v if v[:2] in ("19", "20") else ""


def odisha_mla(year):
    """MLA-wise recommended works for one financial year (2026 = 2026-27), by project id."""
    out, start, size = {}, 0, 5000
    while True:
        params = {"draw": 1, "start": start, "length": size, "search[value]": "", "search[regex]": "false",
                  "order[0][column]": 1, "order[0][dir]": "asc",
                  "DistrictId": 0, "FinancialYear": year, "ConstituencyId": 0, "MlaId": 0, "ExtSearch": ""}
        for i, c in enumerate(REPORT_COLS):
            params.update({f"columns[{i}][data]": c, f"columns[{i}][name]": "", f"columns[{i}][searchable]": "true",
                           f"columns[{i}][orderable]": "true", f"columns[{i}][search][value]": "",
                           f"columns[{i}][search][regex]": "false"})
        d = get_json(ODISHA + "/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport", params)
        rows = (d or {}).get("aaData") or []
        for p in rows:
            code = str(p.get("projectId") or "").strip()
            if code:
                out[code] = {
                    "_row": p,
                    "mla": " ".join((p.get("fullName") or "").split()),
                    "recommended_amount": rupees((p.get("recommendationAmount") or 0) * 100000),
                    "letter_no": " ".join((p.get("letterNo") or "").split()),
                    "recommended_on": day(p.get("recommendationDate")),
                    "sanctioned_on": day(p.get("sanctionDate")),
                    "agency": " ".join((p.get("implementionAgencyName") or "").split()),
                    "block": (p.get("blockULBName") or "").strip().title(),
                    "village": (p.get("wordVillageName") or "").strip(),
                }
        total = (d or {}).get("iTotalDisplayRecords") or 0
        start += size
        if not rows or start >= total:
            return out


def odisha():
    data = get_json(ODISHA + "/Masters/Ajax/GetProjectFinancialList")
    if not isinstance(data, list) or not data:
        return None
    out = []
    for p in data:
        code = str(p.get("projectId") or "").strip()
        if not code:
            continue
        out.append({
            "id": f"od:{code}", "project_code": code, "state": "Odisha",
            "financial_year": p.get("financialYear") or "",
            "district": (p.get("districtName") or "").strip().title(),
            "constituency": (p.get("constituencyName") or "").strip().title(),
            "component": p.get("component") or "", "category": (p.get("category") or "").strip(),
            "department": (p.get("department") or "").strip().title(),
            "name": " ".join((p.get("projectName") or "").split()),
            "sanction_amount": rupees(p.get("sanctionAmount")), "spent_amount": rupees(p.get("expenditureAmount")),
            "days_allowed": str(p.get("completionDays") or ""), "status": p.get("status") or "",
            "source_url": ODISHA + "/IPMS/Report",
        })
    years = sorted({int(r["financial_year"][:4]) for r in out if r["financial_year"][:4].isdigit()})
    extra = {}
    for y in years:
        got = odisha_mla(y)
        print(f"odisha: MLA report {y}: {len(got)} works")
        extra.update(got)
    have = set()
    for r in out:
        x = extra.get(r["project_code"])
        if x:
            r.update({k: v for k, v in x.items() if k != "_row"})
            have.add(r["project_code"])
    # Works the MLA recommended that the project list doesn't carry yet (mostly awaiting
    # sanction, e.g. "Pending with ZP").
    for code, x in extra.items():
        if code in have:
            continue
        p = x["_row"]
        out.append({
            "id": f"od:{code}", "project_code": code, "state": "Odisha",
            "financial_year": p.get("financialYear") or "",
            "district": (p.get("districtName") or "").strip().title(),
            "constituency": (p.get("constituencyName") or "").strip().title(),
            "component": "", "category": (p.get("workCategory") or "").strip(), "department": "",
            "name": " ".join((p.get("workDescription") or "").split()),
            "sanction_amount": rupees(p.get("sanctionAmount")), "spent_amount": "", "days_allowed": "",
            "status": p.get("workStatus") or "", "source_url": ODISHA + "/IPMS/Report",
            **{k: v for k, v in x.items() if k != "_row"},
        })
    return out


UP = "https://mlaladsup.in"


def up_post(sess, path, obj):
    body = "{'obj':" + json.dumps(obj, ensure_ascii=False) + "}"
    for attempt in range(3):
        try:
            r = sess.post(UP + path, data=body.encode("utf-8"), timeout=300, verify=False)
            if r.status_code == 200:
                return r.json()
        except (requests.RequestException, ValueError):
            pass
        time.sleep(10 * (attempt + 1))
    return None


def plain(v):
    """Strip the portal's <br/> tags and dashes used as line breaks."""
    v = re.sub(r"<[^>]+>", " ", str(v or ""))
    v = re.sub(r"\s*\n\s*-?\s*", " ", v)
    return " ".join(v.split()).strip(" -")


def col(row, *words):
    """Value of the first column whose name (tags and spaces removed) contains all the words."""
    for k, v in row.items():
        name = "".join(re.sub(r"<[^>]+>", "", k).split())
        if all(w in name for w in words):
            return v
    return None


def dmy(v):
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", (v or "").strip())
    return f"{m[3]}-{m[2]}-{m[1]}" if m else day(v)


def up():
    names = {}
    path = os.path.join(CSV_DIR, "up_constituencies.json")
    if os.path.exists(path):
        names = {int(k): v for k, v in json.load(open(path, encoding="utf-8")).items()}
    sess = requests.Session()
    sess.headers.update({"User-Agent": UA, "Content-Type": "application/json; charset=utf-8",
                         "X-Requested-With": "XMLHttpRequest", "Referer": UP + "/main/MLAWiseWorkCounts"})
    try:
        sess.get(UP + "/main/MLAWiseWorkCounts", timeout=120, verify=False)
    except requests.RequestException:
        pass
    years = up_post(sess, "/DropdownBinder/fillDropdown", {"optMode": "bindYear"})
    if not years:
        return None
    out = []
    for y in years:
        counts = up_post(sess, "/Main/DistrictWiseWorkCounts", {"optMode": "getWorkMLAWisePhysical", "seatId": "-1",
                                                                "seatTypeId": "1", "yearId": str(y["id"])}) or {}
        seats = []
        for c in counts.get("Table_0") or []:
            m = re.search(r"'proposed',(\d+),", str(col(c, "अनुशंसित") or ""))
            if m:
                seats.append(m[1])
        print(f"up: {y['value']}: {len(seats)} MLAs with works")
        for seat in seats:
            time.sleep(1)
            d = up_post(sess, "/Main/getNikayDistrictWise", {"optMode": "getWorkDetails", "applicationType": "-1",
                                                             "yearId": str(y["id"]), "seatId": seat, "seatTypeId": "1",
                                                             "districtId": "-1"}) or {}
            for w in d.get("Table_0") or []:
                wid = str(col(w, "कार्यआईoडीo") or "").strip()
                if not wid:
                    continue
                who = plain(col(w, "प्रस्तावक"))
                m = re.search(r"विo\s*सo\s*(.+?)\s*\(", who + " (")
                hi_ac = m[1].strip() if m else ""
                mla = re.split(r"\s*(?:माननीय|विo\s*सo)", who)[0].strip()
                prog = col(w, "भौतिकप्रगति", "प्रतिशत")
                prog = float(prog) if isinstance(prog, (int, float)) else None
                done = dmy(col(w, "कार्यपूर्ण"))
                status = "Completed" if done or (prog or 0) >= 100 else "In Progress" if prog else "Not Started"
                out.append({
                    "id": f"up:{wid}", "project_code": wid, "state": "Uttar Pradesh",
                    "financial_year": plain(col(w, "वित्तीयवर्ष")), "_seat": seat, "_district_hi": plain(col(w, "जनपद")),
                    "_ac_hi": hi_ac, "component": "", "category": plain(col(w, "कार्यकाप्रकार")), "department": "",
                    "name": plain(col(w, "कार्यकाविवरण")), "sanction_amount": "", "spent_amount": "", "days_allowed": "",
                    "status": status, "mla": mla,
                    "estimated_amount": rupees((col(w, "आगणितलागत") or 0) * 100000),
                    "progress": "" if prog is None else str(int(prog)),
                    "recommended_on": dmy(col(w, "अनुशंसाकीतिथि")), "sanctioned_on": "",
                    "agency": plain(col(w, "कार्यदायीसंस्था", "कानाम")),
                    "block": plain(col(w, "ब्लॉक")), "village": plain(col(w, "वार्ड")),
                    "source_url": UP + "/main/MLAWiseWorkCounts",
                })
    mlas = up_post(sess, "/DropdownBinder/fillDropdown", {"optMode": "bindMLA", "seatTypeId": "1"}) or []
    seat_ac = {}
    for x in mlas:
        n = (x.get("value") or "").split()
        if n and n[0].isdigit():
            seat_ac[str(x["id"])] = int(n[0])
    for r in out:
        ac = seat_ac.get(r.pop("_seat"))
        en = names.get(ac) or {}
        r["constituency"] = en.get("name") or r["_ac_hi"]
        r["district"] = en.get("district") or r["_district_hi"]
        r.pop("_ac_hi"), r.pop("_district_hi")
    return out


DELHI = "https://udd.delhi.gov.in"


def delhi():
    """Every sanction order file listed on the MLALAD scheme pages, newest data merged over old."""
    names = {}
    path = os.path.join(CSV_DIR, "delhi_constituencies.json")
    if os.path.exists(path):
        names = json.load(open(path, encoding="utf-8"))
    sess = requests.Session()
    sess.headers.update({"User-Agent": UA})
    found, page, last = {}, 0, None
    while last is None or page <= last:
        html = None
        for attempt in range(3):
            try:
                r = sess.get(DELHI + "/mlalad-scheme", params={"page": page} if page else None, timeout=120, verify=False)
                if r.status_code == 200:
                    html = r.text
                    break
            except requests.RequestException:
                pass
            time.sleep(10 * (attempt + 1))
        if html is None:
            print(f"delhi: page {page} did not load, stopping")
            break
        if last is None:
            pages = [int(x) for x in re.findall(r"[?&]page=(\d+)", html)]
            last = max(pages) if pages else 0
        for href, title in re.findall(r'<a href="(/ud/[^"]+)"[^>]*>([^<]+)</a>', html):
            title = " ".join(title.split())
            m = re.match(r"AC\s*-?\s*(\d+)\s*-?\s*\(?\s*(\d+)?\s*(?:-\s*(\d+))?\s*\)?\s*(\d{2})-(\d{2})-(\d{4})", title, re.I)
            if not m:
                continue
            ac = str(int(m[1]))
            a, b = m[2], m[3] or m[2]
            found[href] = {"ac": int(ac), "constituency": names.get(ac, ""), "title": title,
                           "orders": f"{a}-{b}" if a and b != a else (a or ""),
                           "count": int(b) - int(a) + 1 if a and b and int(b) >= int(a) else None,
                           "date": f"{m[6]}-{m[5]}-{m[4]}", "url": DELHI + href}
        page += 1
        time.sleep(1)
    if not found:
        return None
    out = os.path.join(CSV_DIR, "delhi_orders.json")
    old = {}
    if os.path.exists(out):
        old = {o["url"]: o for o in json.load(open(out, encoding="utf-8"))["orders"]}
    t = today()
    for o in found.values():
        o["first_seen"] = old.get(o["url"], {}).get("first_seen") or t
    orders = list({**old, **{o["url"]: o for o in found.values()}}.values())
    orders.sort(key=lambda o: (o["ac"], o["date"]), reverse=True)
    json.dump({"source": DELHI + "/mlalad-scheme", "last_checked": t, "orders": orders},
              open(out, "w", encoding="utf-8"), indent=0, ensure_ascii=False)
    return orders


def save(state_slug, rows, by_year=False):
    """Write a state's works to data/mlalads/<state>.csv, or with by_year to one
    <state>-<year>.csv per financial year (keeps each file well under GitHub's limits)."""
    import glob
    paths = glob.glob(os.path.join(CSV_DIR, f"{state_slug}.csv")) + glob.glob(os.path.join(CSV_DIR, f"{state_slug}-*.csv"))
    old = {}
    for path in paths:
        old.update({r["id"]: r for r in csv.DictReader(open(path, newline="", encoding="utf-8"))})
    t = today()
    for r in rows:
        r["first_seen"] = old.get(r["id"], {}).get("first_seen") or t
        r["last_checked"] = t
    seen = {r["id"] for r in rows}
    # Keep projects that dropped off the portal's current list (e.g. after the year turns),
    # with their last known values and last_checked date.
    rows += [r for i, r in old.items() if i not in seen]
    rows.sort(key=lambda r: (r["constituency"], r["project_code"]))
    os.makedirs(CSV_DIR, exist_ok=True)
    files = {}
    for r in rows:
        name = f"{state_slug}-{r['financial_year'] or 'unknown'}.csv" if by_year else f"{state_slug}.csv"
        files.setdefault(name, []).append(r)
    for path in paths:
        if os.path.basename(path) not in files:
            os.remove(path)
    for name, rs in files.items():
        with open(os.path.join(CSV_DIR, name), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
            w.writeheader()
            w.writerows(rs)
    return len(rows)


def main():
    import urllib3
    urllib3.disable_warnings()
    ok = True
    rows = odisha()
    if rows is None:
        print("odisha: no data (portal down or not reachable from here)")
        ok = False
    else:
        print(f"odisha: {len(rows)} projects fetched, {save('odisha', rows)} kept")
    rows = up()
    if rows is None:
        print("uttar pradesh: no data (portal down or not reachable from here)")
        ok = False
    else:
        print(f"uttar pradesh: {len(rows)} works fetched, {save('uttar-pradesh', rows, by_year=True)} kept")
    orders = delhi()
    if orders is None:
        print("delhi: no sanction orders (portal down or not reachable from here)")
        ok = False
    else:
        print(f"delhi: {len(orders)} sanction order files")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
