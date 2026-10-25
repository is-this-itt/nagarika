"""Official education help portals by state: RTE (free private-school seats) admission
portals and scholarship portals, with their current deadlines and notices.

Many of these sites answer only visitors in India, so this runs on the self-hosted
runner ("India-only sources", task "education"). For each portal it records whether the
page loaded, when it was checked, and the dated notices it shows. Karnataka's SSP and
the National Scholarship Portal get dedicated readers for their deadline sections; other
pages are read generically: the links on the page about admissions or scholarships
(circulars, timelines, apply pages).

Output: data/education/portals.json. The portal list itself is curated here; a portal
that stops loading is kept, marked as not loading.
"""
import datetime as dt
import html
import json
import os
import re
import ssl
import subprocess
import sys

from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import DATA, today  # noqa: E402

OUT = os.path.join(DATA, "education", "portals.json")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

# kind: rte | scholarship. help: phone or email shown on the portal (with the date we saw it).
PORTALS = [
    ("National", "scholarship", "National Scholarship Portal (NSP)", "https://scholarships.gov.in/",
     "Central scholarships, including pre-matric for SC, ST, OBC and minority students (classes 9 and 10) and the National Means-cum-Merit Scholarship."),
    ("Chhattisgarh", "rte", "RTE portal", "https://rte.cg.nic.in/", ""),
    ("Delhi", "rte", "Directorate of Education (EWS/DG admissions)", "https://www.edudel.nic.in/", ""),
    ("Gujarat", "rte", "RTE admission portal", "https://rte.orpgujarat.com/", ""),
    ("Haryana", "rte", "School Education Department", "https://schooleducationharyana.gov.in/", ""),
    ("Jharkhand", "rte", "RTE portal", "https://rte.jharkhand.gov.in/", ""),
    ("Karnataka", "rte", "RTE admission (School Education Department)", "https://schooleducation.karnataka.gov.in/", ""),
    ("Madhya Pradesh", "rte", "RTE portal", "https://rteportal.mp.gov.in/", ""),
    ("Maharashtra", "rte", "RTE 25% admission", "https://student.maharashtra.gov.in/adm_portal/", ""),
    ("Odisha", "rte", "RTE Paradarshi", "https://rteparadarshi.odisha.gov.in/odisha", ""),
    ("Punjab", "rte", "ePunjab School", "https://epunjabschool.gov.in/", ""),
    ("Rajasthan", "rte", "Private School Portal (RTE)", "https://rajpsp.nic.in/PSP1/Home/home.aspx", ""),
    ("Tamil Nadu", "rte", "RTE admission", "https://rte.tnschools.gov.in/", ""),
    ("Uttar Pradesh", "rte", "RTE 25% admission", "https://rte25.upsdc.gov.in/", ""),
    ("Uttarakhand", "rte", "RTE online", "https://rteonline.uk.gov.in/", ""),
    ("Andhra Pradesh", "scholarship", "Jnanabhumi", "https://jnanabhumi.ap.gov.in/", ""),
    ("Delhi", "scholarship", "e-District Delhi", "https://edistrict.delhigovt.nic.in/", ""),
    ("Gujarat", "scholarship", "Digital Gujarat", "https://www.digitalgujarat.gov.in/", ""),
    ("Haryana", "scholarship", "Harchhatravratti (higher education)", "https://harchhatravratti.highereduhry.ac.in/", ""),
    ("Karnataka", "scholarship", "State Scholarship Portal (SSP)", "https://ssp.karnataka.gov.in/", ""),
    ("Kerala", "scholarship", "e-Grantz", "https://egrantz.kerala.gov.in/", ""),
    ("Madhya Pradesh", "scholarship", "MP Scholarship Portal", "https://scholarshipportal.mp.nic.in/", ""),
    ("Maharashtra", "scholarship", "MahaDBT", "https://mahadbt.maharashtra.gov.in/", ""),
    ("Odisha", "scholarship", "State Scholarship Portal", "https://scholarship.odisha.gov.in/", ""),
    ("Rajasthan", "scholarship", "SJMS scholarships", "https://sjmsnew.rajasthan.gov.in/", ""),
    ("Tamil Nadu", "scholarship", "UMIS", "https://umis.tn.gov.in/", ""),
    ("Telangana", "scholarship", "ePASS", "https://telanganaepass.cgg.gov.in/", ""),
    ("Uttar Pradesh", "scholarship", "UP Scholarship", "https://scholarship.up.gov.in/", ""),
    ("West Bengal", "scholarship", "OASIS", "https://oasis.wb.gov.in/", ""),
    ("Bihar", "scholarship", "PMS online", "https://pmsonline.bih.nic.in/", ""),
]

DATE = r"(\d{1,2})[./-](\d{1,2})[./-](20\d\d)"


class LegacyTLS(HTTPAdapter):
    """Several state portals still use old TLS settings that Python refuses by default."""
    def init_poolmanager(self, *a, **kw):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        ctx.set_ciphers("DEFAULT:@SECLEVEL=0")
        ctx.options |= getattr(ssl, "OP_LEGACY_SERVER_CONNECT", 0x4)
        kw["ssl_context"] = ctx
        return super().init_poolmanager(*a, **kw)


def fetch(session, url):
    """Python first; on Windows fall back to curl.exe, whose TLS some portals accept when Python's isn't."""
    try:
        r = session.get(url, timeout=60, verify=False)
        if r.status_code < 500 and len(r.text) > 500:
            return r.status_code, r.text
    except requests.RequestException:
        pass
    if os.name == "nt":
        p = subprocess.run(["curl.exe", "-sS", "-L", "-k", "--max-time", "60", "-A", UA, "-w", "\n%{http_code}", url],
                           capture_output=True)
        out = p.stdout.decode("utf-8", "replace")
        body, _, code = out.rpartition("\n")
        if code.isdigit() and int(code) and len(body) > 500:
            return int(code), body
    return None, ""


def text_of(page):
    page = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", " ", page, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", page))).strip()


def iso(d, m, y):
    try:
        return dt.date(int(y), int(m), int(d)).isoformat()
    except ValueError:
        return ""


STUDENT = re.compile(r"admission|lottery|scholarship|\brte\b|12\s*\(?1\)?\s*\(?c\)?|student|seat|matric|freeship|\bews\b|timeline|last date|notification no|round", re.I)
NOT_STUDENT = re.compile(r"teacher|recruitment|lecturer|interview|coaching|ration card|tender|employee|transfer of|promotion|b\.ed|login|faq|\brules?\b|act of|amendment|trans id|^\S+\.(?:in|com)$", re.I)
# A server's default or maintenance page is not the portal.
PLACEHOLDER = re.compile(r"Apache2? [\w ]*Default Page|<title>IIS Windows Server|It works!</h1>|under maintenance", re.I)
MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split()


def a_date(t):
    """The latest date written in a notice title, as YYYY-MM-DD, or ''."""
    found = [iso(d, m, y if len(y) == 4 else "20" + y) for d, m, y in re.findall(r"\b(\d{1,2})[./-](\d{1,2})[./-](20\d\d|\d\d)\b", t)]
    for d, mon, y in re.findall(r"\b(\d{1,2})[- ]([A-Za-z]{3})[a-z]*[- ,]+(20\d\d)\b", t):
        if mon.lower() in MONTHS:
            found.append(iso(d, MONTHS.index(mon.lower()) + 1, y))
    return max((d for d in found if d), default="")


def notice_links(page, base, limit=8):
    """Links on the page about admissions or scholarships (circulars, timelines, 'apply'
    pages), in page order, which on these portals is usually newest first."""
    out, seen = [], set()
    for m in re.finditer(r"<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", page, re.S | re.I):
        href, t = m.group(1).strip(), text_of(m.group(2))
        if not (10 <= len(t) <= 220) or not STUDENT.search(t) or NOT_STUDENT.search(t):
            continue
        if href.startswith(("#", "javascript:", "mailto:")):
            continue
        key = re.sub(r"\W+", "", t.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append({"text": t, "url": urljoin(base, html.unescape(href)), "date": a_date(t)})
    return out[:limit]


def nsp_dates(text):
    """NSP's banner: 'Closing dates for student application is 31-10-2026 and closing date
    for institute verification is : 15-11-2026 and ... L2 verification is : 30/11/2026'."""
    out = []
    for label, step in (("student application", "Students apply"), ("institute verification", "School or college verifies"),
                        ("L1 verification", "District (L1) verifies"), ("L2 verification", "State (L2) verifies")):
        m = re.search(re.escape(label) + r"\s*is\s*:?\s*" + DATE, text, re.I)
        if m:
            out.append({"scheme": step, "level": "All NSP scholarships", "last_date": iso(*m.groups())})
    return out


def ssp_karnataka(page):
    """The SSP home page has a 'Last Dates' section with a card per department, for
    post-matric (class 11+) and pre-matric (classes 1 to 10)."""
    out = []
    for panel, level in (("ld-pre", "Classes 1 to 10 (pre-matric)"), ("ld-post", "Class 11 and above (post-matric)")):
        i = page.find(f'id="{panel}"')
        if i < 0:
            continue
        block = page[i:i + 20000]
        nxt = block.find('class="pp-panel', 10)
        block = block[:nxt] if nxt > 0 else block
        for m in re.finditer(r"ld-card-main-title'>([^<]+)<.*?<strong>([^<]+)</strong>", block, re.S):
            d = re.search(DATE, m.group(2))
            if d:
                out.append({"scheme": html.unescape(m.group(1)).strip(), "level": level, "last_date": iso(*d.groups())})
    return out


def main():
    import urllib3
    urllib3.disable_warnings()
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9"})
    s.mount("https://", LegacyTLS())
    old = {}
    if os.path.exists(OUT):
        old = {p["url"]: p for p in json.load(open(OUT, encoding="utf-8"))["portals"]}
    t = today()
    portals = []
    for state, kind, name, url, about in PORTALS:
        status, page = fetch(s, url)
        p = {"state": state, "kind": kind, "name": name, "url": url, "about": about, "checked": t,
             "loads": bool(status and status < 400) and not PLACEHOLDER.search(page[:5000])}
        if p["loads"]:
            text = text_of(page)
            p["notices"] = notice_links(page, url)
            phones = sorted(set(re.findall(r"(?:toll[- ]free|helpline)[^0-9]{0,30}(1800[\s-]?\d{3,4}[\s-]?\d{3,4}|0\d{2,4}[\s-]?\d{6,8})", text, re.I)))
            p["helplines"] = phones[:3]
            if "ssp.karnataka.gov.in" in url:
                p["deadlines"] = ssp_karnataka(page)
            elif "scholarships.gov.in" in url:
                p["deadlines"] = nsp_dates(text)
            p["last_loaded"] = t
        else:
            prev = old.get(url, {})
            p.update({k: prev[k] for k in ("notices", "helplines", "deadlines", "last_loaded") if k in prev})
        portals.append(p)
        print(f"{state:15} {kind:11} {'ok ' if p['loads'] else 'NO '} {len(p.get('notices', []))} notices  {url}")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"checked": t, "portals": portals}, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
