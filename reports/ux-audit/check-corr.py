from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    c = b.new_context(viewport={"width": 1280, "height": 900})
    d = c.new_page()
    d.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=30000)
    d.wait_for_load_state("networkidle", timeout=15000)
    d.screenshot(path="reports/ux-audit/home-pos-corr.png", full_page=True, animations="disabled")
    skip = len(d.query_selector_all(".skip-link"))
    focus_style = d.evaluate("() => { const s = document.styleSheets; for(const sh of s){ try{ for(const r of sh.cssRules){ if(r.selectorText && r.selectorText.includes(':focus-visible')) return r.style.cssText; }}catch(e){} } return 'nenhum'; }")
    print("skip-link:", skip)
    print("focus-visible CSS:", focus_style[:200])
    b.close()
