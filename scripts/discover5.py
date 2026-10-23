"""Screenshots of the eSAKSHI MPLADS dashboard, step by step, for a citizen guide."""
import asyncio, os, json
from playwright.async_api import async_playwright

OUT = "raw8"
os.makedirs(OUT, exist_ok=True)
log = []

async def shot(pg, name, full=False):
    await pg.screenshot(path=f"{OUT}/{name}.png", full_page=full)
    log.append(name)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        await pg.goto("https://mplads.mospi.gov.in/", wait_until="domcontentloaded", timeout=120000)
        await pg.wait_for_timeout(3000)
        log.append("home loaded")
        await shot(pg, "01_home")
        # Visible menu and button texts on the home page.
        texts = await pg.evaluate("""() => [...document.querySelectorAll('a,button')].filter(e => e.offsetParent)
            .map(e => (e.innerText || '').trim()).filter(t => t && t.length < 60)""")
        json.dump(texts, open(f"{OUT}/home_links.json", "w"), indent=0)
        await pg.goto("https://mplads.mospi.gov.in/digigov/dashboard.html", wait_until="domcontentloaded", timeout=120000)
        await pg.wait_for_timeout(5000)
        await shot(pg, "02_dashboard_popup")
        for sel in [".privacy-close", "#privacyPolicyModal .btn-close", "#privacyPolicyModal button"]:
            try:
                await pg.click(sel, timeout=4000)
                log.append(f"closed popup with {sel}")
                break
            except Exception:
                pass
        await pg.wait_for_timeout(1500)
        await shot(pg, "02_dashboard")
        await shot(pg, "02_dashboard_full", True)
        texts = await pg.evaluate("""() => [...document.querySelectorAll('a,button,label,h1,h2,h3,h4,h5,select,option,input')].filter(e => e.offsetParent || e.tagName=='OPTION')
            .map(e => e.tagName + ' #' + e.id + ' ' + ((e.innerText || e.value || e.placeholder || '')+'').trim().slice(0,80))""")
        json.dump(texts, open(f"{OUT}/dashboard_elems.json", "w"), indent=0)
        # Open the filter, choose Karnataka > Bangalore South, search.
        try:
            await pg.click("#lok", timeout=10000)
            await pg.wait_for_timeout(1500)
            await pg.click("#dropdownMenuButton1", timeout=10000)
            await pg.wait_for_timeout(1500)
            await shot(pg, "03_filter_open")
            await pg.select_option("#tenure", label="18th Lok Sabha")
            await pg.wait_for_timeout(1000)
            await pg.select_option("#demo", label="Karnataka")
            await pg.wait_for_timeout(2500)
            await pg.select_option("#constituency", label="BANGALORE SOUTH")
            await pg.wait_for_timeout(2500)
            await pg.wait_for_timeout(2500)
            await shot(pg, "04_filter_chosen")
            await pg.click("#searchFilter")
            await pg.wait_for_timeout(5000)
            await shot(pg, "05_after_search")
            await shot(pg, "05_after_search_full", True)
        except Exception as e:
            log.append(f"filter error {e!r}")
        try:
            tiles = await pg.query_selector_all(".Dashboard-tile, .financeData .tile")
            log.append(f"tiles {len(tiles)}")
            for t in tiles:
                v = await t.get_attribute("value")
                log.append(f"tile value {v}")
            target = None
            for t in tiles:
                if (await t.get_attribute("value") or "").startswith("Works Recommended"):
                    target = t
            if target:
                await target.click()
                await pg.wait_for_timeout(8000)
                await shot(pg, "06_works_table")
                await shot(pg, "06_works_table_full", True)
                await pg.mouse.wheel(0, 600)
                await pg.wait_for_timeout(1000)
                await shot(pg, "07_table_scrolled")
        except Exception as e:
            log.append(f"tile error {e!r}")
        json.dump(log, open(f"{OUT}/_log.json", "w"), indent=0)
        await b.close()

try:
    asyncio.run(main())
except Exception as e:
    log.append(f"fatal {e!r}")
json.dump(log, open(f"{OUT}/_log.json", "w"), indent=0)
