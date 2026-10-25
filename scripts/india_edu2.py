"""Check candidate official RTE-admission and scholarship portals per state (run from India).
Records status, final URL, page title and keyword hits; saves each page for reading."""
import json, os, re, requests, urllib3
urllib3.disable_warnings()
OUT = "raw14"
os.makedirs(OUT, exist_ok=True)
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
     "Accept-Language": "en-IN,en;q=0.9"}
RTE = {
    "Andhra Pradesh": ["https://cse.ap.gov.in/RTE"],
    "Bihar": ["https://pmsonline.bih.nic.in/rte"],
    "Chhattisgarh": ["https://rte.cg.nic.in/"],
    "Delhi": ["https://www.edudel.nic.in/", "https://edustud.nic.in/"],
    "Gujarat": ["https://rte.orpgujarat.com/", "https://gscpcr.gujarat.gov.in/rte-structure"],
    "Haryana": ["https://schooleducationharyana.gov.in/"],
    "Jharkhand": ["https://rte.jharkhand.gov.in/"],
    "Karnataka": ["https://sdcedn.karnataka.gov.in/rteadmission/RTE/page1.aspx", "https://schooleducation.karnataka.gov.in/"],
    "Madhya Pradesh": ["https://rteportal.mp.gov.in/"],
    "Maharashtra": ["https://student.maharashtra.gov.in/adm_portal/"],
    "Odisha": ["https://rteparadarshi.odisha.gov.in/"],
    "Punjab": ["https://epunjabschool.gov.in/"],
    "Rajasthan": ["https://rajpsp.nic.in/PSP1/Home/home.aspx"],
    "Tamil Nadu": ["https://rte.tnschools.gov.in/", "https://tnschools.gov.in/rte"],
    "Telangana": ["https://schooledu.telangana.gov.in/ISMS/"],
    "Uttar Pradesh": ["https://rte25.upsdc.gov.in/"],
    "Uttarakhand": ["https://rteonline.uk.gov.in/"],
    "West Bengal": ["https://banglarshiksha.gov.in/"],
    "Kerala": ["https://kescpcr.kerala.gov.in/rte-cell"],
}
SCHOL = {
    "National": ["https://scholarships.gov.in/"],
    "Andhra Pradesh": ["https://jnanabhumi.ap.gov.in/"],
    "Bihar": ["https://pmsonline.bih.nic.in/"],
    "Delhi": ["https://edistrict.delhigovt.nic.in/"],
    "Gujarat": ["https://www.digitalgujarat.gov.in/"],
    "Haryana": ["https://harchhatravratti.highereduhry.ac.in/"],
    "Karnataka": ["https://ssp.karnataka.gov.in/", "https://ssp.prematric.karnataka.gov.in/"],
    "Kerala": ["https://egrantz.kerala.gov.in/"],
    "Madhya Pradesh": ["https://scholarshipportal.mp.nic.in/"],
    "Maharashtra": ["https://mahadbt.maharashtra.gov.in/"],
    "Odisha": ["https://scholarship.odisha.gov.in/"],
    "Rajasthan": ["https://sjmsnew.rajasthan.gov.in/"],
    "Tamil Nadu": ["https://umis.tn.gov.in/"],
    "Telangana": ["https://telanganaepass.cgg.gov.in/"],
    "Uttar Pradesh": ["https://scholarship.up.gov.in/"],
    "West Bengal": ["https://oasis.gov.in/", "https://svmcm.wbhed.gov.in/"],
}
KW = re.compile(r"RTE|12\s*\(1\)\s*\(c\)|25\s*%|lottery|admission|scholarship|pre[- ]?matric|post[- ]?matric|last date|\b20(25|26|27)-?2?[67]?\b", re.I)
log = []
n = 0
for kind, table in (("rte", RTE), ("scholarship", SCHOL)):
    for state, urls in table.items():
        for url in urls:
            n += 1
            try:
                r = requests.get(url, headers=H, timeout=45, verify=False, allow_redirects=True)
                t = r.text
                name = f"{n:03d}_{kind}_{re.sub(r'[^a-z]+', '-', state.lower())}.html"
                with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
                    f.write(t[:400000])
                title = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
                text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)))
                hits = sorted({m.group(0) for m in KW.finditer(text)})[:25]
                dates = re.findall(r"[^.]{0,80}(?:last date|from|till|to)\s*[:\-]?\s*\d{1,2}[./-]\d{1,2}[./-]20\d\d[^.]{0,40}", text, re.I)[:6]
                log.append({"kind": kind, "state": state, "url": url, "status": r.status_code, "final": r.url,
                            "title": (title.group(1).strip() if title else "")[:200], "bytes": len(t), "hits": hits,
                            "dates": dates, "file": name})
            except Exception as e:
                log.append({"kind": kind, "state": state, "url": url, "error": repr(e)[:200]})
with open(f"{OUT}/_log.json", "w", encoding="utf-8") as f:
    json.dump(log, f, indent=1, ensure_ascii=False)
