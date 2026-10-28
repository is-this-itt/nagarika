"""Bengaluru street cleanliness and traffic: official sites (GBA, the five city corporations,
BSWML, BBMP, Bengaluru Traffic Police, Transport dept). Saves home pages, pages whose links
mention waste/traffic topics, small PDFs about fines, rules, bylaws and fees, and a link index. -> raw26/"""
import json, os, re, time, requests, urllib3
from urllib.parse import urljoin, urlparse
urllib3.disable_warnings()
OUT = "raw26"; os.makedirs(OUT, exist_ok=True)
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
     "Accept-Language": "en-IN,en;q=0.9"}
SITES = ["https://btp.karnataka.gov.in/", "https://bangaloretrafficpolice.gov.in/", "https://transport.karnataka.gov.in/",
         "https://gba.karnataka.gov.in/", "https://site.bbmp.gov.in/", "https://bbmp.gov.in/",
         "https://bswml.in/", "https://www.bswml.in/", "https://bswml.karnataka.gov.in/",
         "https://kspcb.karnataka.gov.in/", "https://urbandevelopment.karnataka.gov.in/", "https://bmrda.karnataka.gov.in/"]
WANT = re.compile(r"waste|garbage|swm|sanitat|clean|blackspot|black spot|segregat|user fee|bylaw|bye-law|fine|penalt|traffic|challan|"
                  r"advisor|notification|circular|order|rule|helpline|complain|grievance|sahaaya|contact|corporation|zone|ward|press|news|"
                  r"parking|signal|speed|helmet|road safety|ward committee", re.I)
PDFW = re.compile(r"fine|penalt|bylaw|bye-law|user fee|swm|waste|garbage|traffic|notification|rule|advisor|circular|order", re.I)
SKIP = (".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".mp4", ".zip")
log, index = [], []
seen = set()
def safe(u):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", u.split("://", 1)[-1])[:150]
def get(u, **kw):
    return requests.get(u, headers=H, timeout=45, verify=False, **kw)
for site in SITES:
    host = urlparse(site).netloc
    try:
        r = get(site)
    except Exception as e:
        log.append({"url": site, "error": repr(e)[:200]}); continue
    log.append({"url": site, "final": r.url, "status": r.status_code, "bytes": len(r.content)})
    open(os.path.join(OUT, safe(r.url) + ".html"), "w", encoding="utf-8").write(r.text)
    base_host = urlparse(r.url).netloc
    links = []
    for href, text in re.findall(r'<a[^>]+href=["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', r.text, re.S | re.I):
        text = " ".join(re.sub(r"<[^>]+>", " ", text).split())[:150]
        u = urljoin(r.url, href.strip())
        if not u.startswith("http"):
            continue
        links.append({"from": r.url, "url": u, "text": text})
    index += links
    pages = 0
    for l in links:
        u, t = l["url"], l["text"]
        if u in seen or u.lower().endswith(SKIP):
            continue
        seen.add(u)
        is_pdf = u.lower().endswith(".pdf")
        same = urlparse(u).netloc in (host, base_host)
        if is_pdf and PDFW.search(t + " " + u):
            try:
                h = requests.head(u, headers=H, timeout=30, verify=False, allow_redirects=True)
                size = int(h.headers.get("content-length") or 0)
                if size and size > 6_000_000:
                    log.append({"url": u, "skipped_pdf_bytes": size}); continue
                p = get(u)
                open(os.path.join(OUT, safe(u)), "wb").write(p.content)
                log.append({"url": u, "status": p.status_code, "bytes": len(p.content), "text": t})
            except Exception as e:
                log.append({"url": u, "error": repr(e)[:200]})
        elif same and not is_pdf and WANT.search(t + " " + u) and pages < 40:
            pages += 1
            try:
                p = get(u)
                open(os.path.join(OUT, safe(p.url) + ".html"), "w", encoding="utf-8").write(p.text)
                log.append({"url": u, "final": p.url, "status": p.status_code, "bytes": len(p.content), "text": t})
                for href, text in re.findall(r'<a[^>]+href=["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', p.text, re.S | re.I):
                    text = " ".join(re.sub(r"<[^>]+>", " ", text).split())[:150]
                    uu = urljoin(p.url, href.strip())
                    if uu.startswith("http"):
                        index.append({"from": p.url, "url": uu, "text": text})
            except Exception as e:
                log.append({"url": u, "error": repr(e)[:200]})
        time.sleep(0.5)
json.dump(log, open(os.path.join(OUT, "_log.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump(index, open(os.path.join(OUT, "_links.json"), "w", encoding="utf-8"), indent=0, ensure_ascii=False)
