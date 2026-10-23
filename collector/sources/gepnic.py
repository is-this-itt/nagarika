"""NIC GePNIC e-procurement portals: the central portal and most state portals.

All GePNIC portals share one front end, so one adapter covers them. For each
portal it lists active tenders of selected organisations ("Tenders by
Organisation", no captcha), opens each new tender's detail page and keeps the
road-related works. Award results sit behind a captcha, so the contractor is not
collected here.

Tender pages use session-bound links, so a record's source link points to the
portal and the note gives the Tender ID to search for.
"""
import html
import re
import time
import urllib.parse

import requests

from common import STATE_LGD, add_days, is_road_work, money, parse_date, upsert

UA = {"User-Agent": "Mozilla/5.0 (compatible; nagarika civic data; +https://github.com/is-this-itt/nagarika)"}

# Organisations that build or dig up roads.
ORG_RE = re.compile(r"municipal|corporation of|mahanagar|nagar (nigam|palika|panchayat)|nagarpalika|"
                    r"public works|\bpwd\b|highway|road development|roads? (and|&) bridges|"
                    r"development authority|urban development|smart city|panchayat raj|rural (works|development)|"
                    r"cpwd|nhidcl|border roads", re.I)
ORG_SKIP = re.compile(r"road transport|transport corporation|bus|university|institute|hospital|bank", re.I)

# key: (state, base url, {organisation: pilot city})
PORTALS = {
    "central": ("Central", "https://eprocure.gov.in/eprocure/app", {}),
    "tn": ("Tamil Nadu", "https://tntenders.gov.in/nicgep/app", {"Corporation of Chennai": "chennai"}),
    "mh": ("Maharashtra", "https://mahatenders.gov.in/nicgep/app",
           {"Municipal Corporation of Greater Mumbai": "mumbai"}),
    "dl": ("Delhi", "https://govtprocurement.delhi.gov.in/nicgep/app", {}),
    # Not yet confirmed reachable from GitHub runners; failures are reported, not fatal.
    "kl": ("Kerala", "https://etenders.kerala.gov.in/nicgep/app", {}),
    "wb": ("West Bengal", "https://wbtenders.gov.in/nicgep/app", {}),
    "rj": ("Rajasthan", "https://eproc.rajasthan.gov.in/nicgep/app", {}),
    "up": ("Uttar Pradesh", "https://etender.up.nic.in/nicgep/app", {}),
    "pb": ("Punjab", "https://eproc.punjab.gov.in/nicgep/app", {}),
    "hr": ("Haryana", "https://etenders.hry.nic.in/nicgep/app", {}),
    "hp": ("Himachal Pradesh", "https://hptenders.gov.in/nicgep/app", {}),
    "od": ("Odisha", "https://tendersodisha.gov.in/nicgep/app", {}),
    "as": ("Assam", "https://assamtenders.gov.in/nicgep/app", {}),
    "jh": ("Jharkhand", "https://jharkhandtenders.gov.in/nicgep/app", {}),
    "uk": ("Uttarakhand", "https://uktenders.gov.in/nicgep/app", {}),
    "ga": ("Goa", "https://eprocure.goa.gov.in/nicgep/app", {}),
    "tr": ("Tripura", "https://tripuratenders.gov.in/nicgep/app", {}),
    "mn": ("Manipur", "https://manipurtenders.gov.in/nicgep/app", {}),
    "ml": ("Meghalaya", "https://meghalayatenders.gov.in/nicgep/app", {}),
    "mz": ("Mizoram", "https://mizoramtenders.gov.in/nicgep/app", {}),
    "nl": ("Nagaland", "https://nagalandtenders.gov.in/nicgep/app", {}),
    "ar": ("Arunachal Pradesh", "https://arunachaltenders.gov.in/nicgep/app", {}),
    "jk": ("Jammu and Kashmir", "https://jktenders.gov.in/nicgep/app", {}),
    "ch": ("Chandigarh", "https://etenders.chd.nic.in/nicgep/app", {}),
}
MAX_NEW_PER_PORTAL = 150  # detail pages fetched per portal per run


def _text(fragment):
    t = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(t)).replace("\xa0", " ").strip()


def detail_fields(page):
    """All caption/field pairs of a tender detail page."""
    out = {}
    for cap, val in re.findall(r'class="td_caption"[^>]*>(.*?)</td>\s*<td[^>]*class="td_field"[^>]*>(.*?)</td>',
                               page, re.S):
        k = _text(cap)
        if k and k not in out:
            out[k] = _text(val)
    return out


def org_links(page):
    rows = re.findall(r'<td[^>]*>\s*\d+\s*</td>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>\s*<a[^>]*href="([^"]+)"', page)
    return [(html.unescape(o).strip(), html.unescape(h)) for o, h in rows]


def tender_rows(page):
    rows = []
    for tr in re.findall(r'<tr class="(?:even|odd)"[^>]*>(.*?)</tr>', page, re.S):
        link = re.search(r'href="([^"]*FrontEndViewTender[^"]*)"', tr)
        tid = re.findall(r"\[([^\[\]]+)\]", _text(tr))
        if link and tid:
            rows.append((tid[-1], html.unescape(link.group(1))))
    return rows


def to_record(key, state, base, org_city, tid, f, matchers):
    desc = f.get("Work Description", "")
    title = f.get("Title", "")
    if not is_road_work(desc, title):
        return None
    chain = [c.strip() for c in f.get("Organisation Chain", "").split("||") if c.strip()]
    agency = chain[0] if chain else ""
    city = org_city.get(agency, "")
    loc = f.get("Location", "")
    wards, how = [], "none"
    if city in matchers:
        wards = matchers[city].match(" ".join([desc, title, loc]))
        how = "text" if wards else "none"
    period = re.sub(r"\D", "", f.get("Period Of Work(Days)", ""))
    opening = parse_date(f.get("Bid Opening Date", ""))
    deadline = add_days(opening, period) if period and int(period) > 0 else ""
    portal = base.rsplit("/", 1)[0]
    return {
        "id": f"gepnic-{key}:{tid}", "source": f"gepnic-{key}", "source_id": tid,
        "source_url": base + "?page=FrontEndAdvancedSearch&service=page",
        "source_note": f"Search Tender ID {tid} on {portal} (Search > Tender ID). "
                       f"Award results are under 'Results of Tenders' (captcha).",
        "title": desc or title, "agency": agency, "office": " / ".join(chain[1:]),
        "contractor": "", "state": state, "state_lgd": STATE_LGD.get(state, ""), "city": city,
        "place": loc.title(), "pincode": re.sub(r"\D", "", f.get("Pincode", "")),
        "ward_ids": ";".join(wards), "ward_match": how, "location_text": loc,
        "sanctioned_cost": money(f.get("Tender Value in ₹", "")), "cost_basis": "Tender value",
        "published_date": parse_date(f.get("Published Date", "")), "start_date": "",
        "period_days": period, "deadline": deadline,
        "deadline_basis": "estimated: bid opening date + period of work (award date not published)" if deadline else "",
        "status": "Tender published",
    }


def run_portal(key, works, matchers, report, deadline_ts):
    state, base, org_city = PORTALS[key]
    s = requests.Session()
    s.headers.update(UA)
    try:
        page = s.get(base + "?page=FrontEndTendersByOrganisation&service=page", timeout=60).text
    except requests.RequestException as e:
        report.add(f"gepnic-{key}", f"unreachable ({type(e).__name__})")
        return
    orgs = [(o, h) for o, h in org_links(page)
            if (o in org_city or ORG_RE.search(o)) and not ORG_SKIP.search(o)]
    if not orgs:
        report.add(f"gepnic-{key}", "no organisation list found (page layout or blocking)")
        return
    new = kept = 0
    for org, href in orgs:
        if time.time() > deadline_ts or new >= MAX_NEW_PER_PORTAL:
            break
        try:
            lst = s.get(urllib.parse.urljoin(base, href), timeout=60).text
        except requests.RequestException:
            continue
        for tid, link in tender_rows(lst):
            rid = f"gepnic-{key}:{tid}"
            if rid in works:
                works[rid]["last_checked"] = time.strftime("%Y-%m-%d")
                continue
            if new >= MAX_NEW_PER_PORTAL or time.time() > deadline_ts:
                break
            try:
                f = detail_fields(s.get(urllib.parse.urljoin(base, link), timeout=60).text)
            except requests.RequestException:
                continue
            new += 1
            time.sleep(0.5)
            rec = to_record(key, state, base, org_city, tid, f, matchers)
            if rec:
                upsert(works, rec)
                kept += 1
    report.add(f"gepnic-{key}", f"{len(orgs)} organisations, {new} new tenders read, {kept} road works kept")


def run(works, state, matchers, report, budget_s):
    t0 = time.time()
    keys = list(PORTALS)
    for i, key in enumerate(keys):
        # Share the remaining time between the remaining portals.
        left = budget_s - (time.time() - t0)
        if left <= 0:
            report.add(f"gepnic-{key}", "skipped (time budget used)")
            continue
        run_portal(key, works, matchers, report, time.time() + left / (len(keys) - i))
