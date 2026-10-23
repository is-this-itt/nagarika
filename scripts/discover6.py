"""Step-by-step screenshots of the eSAKSHI MPLADS dashboard for the citizen guide (retries while the portal is down)."""
import asyncio, os, json, time
from playwright.async_api import async_playwright

OUT = "raw10"
os.makedirs(OUT, exist_ok=True)
log = []
CLOSE_JS = """() => { document.querySelectorAll('.modal.show').forEach(m => { m.classList.remove('show'); m.style.display = 'none'; });
  document.querySelectorAll('.modal-backdrop').forEach(e => e.remove()); document.body.classList.remove('modal-open'); document.body.style.overflow = ''; }"""


async def shot(pg, name, full=False):
    await pg.screenshot(path=f"{OUT}/{name}.png", full_page=full)
    log.append(name)


async def attempt(p):
    b = await p.chromium.launch()
    pg = await b.new_page(viewport={"width": 1280, "height": 860})
    try:
        await pg.goto("https://mplads.mospi.gov.in/digigov/dashboard.html", wait_until="domcontentloaded", timeout=120000)
        await pg.wait_for_timeout(6000)
        if "Service Unavailable" in (await pg.content()):
            log.append("service unavailable")
            return False
        await shot(pg, "02_dashboard_popup")
        closed = False
        for sel in ["#privacyPolicyModal [data-bs-dismiss=modal]", "#privacyPolicyModal .btn-close", "#privacyPolicyModal button"]:
            try:
                await pg.click(sel, timeout=4000)
                closed = True
                log.append(f"closed popup with {sel}")
                break
            except Exception:
                pass
        await pg.wait_for_timeout(1500)
        await pg.evaluate(CLOSE_JS)  # make sure the static-backdrop modal is gone
        log.append(f"popup closed by click: {closed}")
        await shot(pg, "03_dashboard")
        await pg.click("#lok", timeout=10000)
        await pg.wait_for_timeout(2000)
        await pg.click("#dropdownMenuButton1", timeout=10000)
        await pg.wait_for_timeout(1500)
        await shot(pg, "04_filter_open")
        await pg.select_option("#tenure", label="18th Lok Sabha")
        await pg.wait_for_timeout(1500)
        await pg.select_option("#demo", label="Karnataka")
        await pg.wait_for_timeout(3000)
        opts = await pg.eval_on_selector_all("#constituency option", "os => os.map(o => o.textContent.trim())")
        log.append(f"constituencies {opts[:40]}")
        label = next((o for o in opts if o.upper() == "BANGALORE SOUTH"), None) or next(o for o in opts if "SOUTH" in o.upper())
        await pg.select_option("#constituency", label=label)
        await pg.wait_for_timeout(3000)
        await shot(pg, "04_filter_chosen")
        await pg.click("#searchFilter")
        await pg.wait_for_timeout(7000)
        await pg.evaluate(CLOSE_JS)
        await shot(pg, "05_after_search")
        await shot(pg, "05_after_search_full", True)
        tiles = await pg.query_selector_all(".Dashboard-tile, .financeData .tile")
        target = None
        for t in tiles:
            if (await t.get_attribute("value") or "").startswith("Works Recommended"):
                target = t
        log.append(f"tiles {len(tiles)}, works tile {bool(target)}")
        if target:
            await target.click()
            await pg.wait_for_timeout(10000)
            await shot(pg, "06_works_table_full", True)
            box = await pg.evaluate("""() => { const t = document.querySelector('table.dataTable, table'); if (!t) return null;
                const r = t.getBoundingClientRect(); return [r.top + window.scrollY, r.height]; }""")
            log.append(f"table box {box}")
            if box:
                await pg.evaluate(f"window.scrollTo(0, {max(0, box[0] - 160)})")
                await pg.wait_for_timeout(1000)
                await shot(pg, "06_works_table")
        return True
    except Exception as e:
        log.append(f"error {e!r}"[:800])
        return "02_dashboard_popup" in log and len(log) > 4
    finally:
        await b.close()


async def main():
    async with async_playwright() as p:
        for i in range(8):
            log.append(f"attempt {i + 1} at {time.strftime('%H:%M:%S')}")
            if await attempt(p):
                break
            await asyncio.sleep(240)


try:
    asyncio.run(main())
except Exception as e:
    log.append(f"fatal {e!r}")
json.dump(log, open(f"{OUT}/_log.json", "w"), indent=0)
