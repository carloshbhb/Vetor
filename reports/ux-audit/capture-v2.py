# -*- coding: utf-8 -*-
"""UX audit v2: screenshots + DOM/ARIA extraction per page/viewport."""
import json, os, re, time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens")
os.makedirs(OUT, exist_ok=True)
RESULT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capture-v2-results.json")

password = None
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env.local"), "r", encoding="utf-8", errors="replace") as f:
    for line in f:
        m = re.match(r"^ADMIN_PASSWORD=(.*)$", line.strip())
        if m:
            password = m.group(1).strip().strip('"').strip("'")
            break

VP = {"desktop": (1280, 900), "tablet": (768, 1024), "mobile": (375, 812)}

PAGES = [
    ("home", "/"),
    ("reviews-list", "/reviews/"),
    ("comparativos-list", "/comparativos/"),
    ("melhores-list", "/melhores/"),
    ("guias-list", "/guias/"),
    ("ofertas-list", "/ofertas/"),
]

ADMIN_PAGES = [
    ("admin-dashboard", "/admin"),
    ("admin-reviews", "/admin/reviews"),
    ("admin-viral", "/admin/viral"),
    ("admin-videos", "/admin/videos"),
    ("admin-generate", "/admin/generate"),
    ("admin-afiliados", "/admin/afiliados"),
    ("admin-monetizacao", "/admin/monetizacao"),
    ("admin-oportunidades", "/admin/oportunidades"),
    ("admin-mercado", "/admin/mercado"),
    ("admin-ml", "/admin/ml"),
    ("admin-ml-fila", "/admin/ml/fila"),
    ("admin-product-links", "/admin/product-links"),
    ("admin-video-panel", "/admin/video-panel"),
]

EMPTY_PATTERNS = ["nenhum", "sem resultado", "nenhuma", "encontrei", "vazio"]
results = {"pages": {}, "notes": []}


def extract(dom):
    info = {
        "title": dom.evaluate("() => document.title || '(sem title)'"),
        "h1": None,
        "h2s": [],
        "skip_links": 0,
        "empty_main": False,
        "buttons": 0,
        "links": 0,
        "imgs_no_alt": 0,
        "a_aria_label": 0,
        "focuselement": "none",
        "page_width": None,
        "console_errors": [],
    }
    try:
        h1 = dom.query_selector("h1")
        if h1:
            info["h1"] = h1.inner_text().strip().replace("  ", " ").replace("  ", " ")
    except Exception:
        info["h1"] = "(erro)"
    try:
        info["h2s"] = [e.inner_text().strip() for e in dom.query_selector_all("h2")[:8]]
    except Exception:
        info["h2s"] = []
    try:
        info["skip_links"] = len(dom.query_selector_all(".skip-link, [href='#']"))
    except Exception:
        pass
    try:
        info["empty_main"] = not bool(dom.query_selector("main"))
    except Exception:
        pass
    try:
        info["buttons"] = len(dom.query_selector_all("button"))
        info["links"] = len(dom.query_selector_all("a"))
    except Exception:
        pass
    try:
        info["imgs_no_alt"] = len(dom.query_selector_all("img:not([alt])"))
    except Exception:
        pass
    try:
        info["a_aria_label"] = len(dom.query_selector_all('[aria-label]'))
    except Exception:
        pass
    try:
        info["focuselement"] = dom.evaluate("() => { const a = document.activeElement; return a ? a.tagName + '.' + (a.className||'').replace(/\\s+/g,'|') + '#' + (a.id||'') : 'none'; }")
    except Exception:
        info["focuselement"] = "erro"
    try:
        info["page_width"] = dom.evaluate("() => ({ w: document.documentElement.clientWidth, body: document.body.clientWidth })")
    except Exception:
        info["page_width"] = None
    dom.on("console", lambda msg: info["console_errors"].append(msg.text[:200]) if msg.type in ("error","warning") else None)
    dom.on("pageerror", lambda e: info["console_errors"].append("PAGEERROR: " + str(e)[:200]))
    return info


def has_empty_state(dom):
    texts = dom.evaluate("() => Array.from(document.querySelectorAll('main *, header *, footer *')).map(e => e.innerText.toLowerCase())")
    texts = [t for t in texts if any(p in t for p in EMPTY_PATTERNS)]
    return texts[:5]


def audit(dom, path, name, vp_name, full=True, extra_screenshots=None):
    try:
        dom.goto(BASE + path, wait_until="domcontentloaded", timeout=90000)
        try:
            dom.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
        time.sleep(1.0)
    except Exception as e:
        return {"error": "load failed: " + str(e)[:250], "viewport": vp_name}

    signals = extract(dom)
    signals["url"] = BASE + path
    signals["viewport"] = vp_name
    try:
        signals["overflow_x"] = dom.evaluate(
            "() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
    except Exception:
        signals["overflow_x"] = None
    signals["empty_state"] = has_empty_state(dom)

    path_out = os.path.join(OUT, f"{name}-{vp_name}.png")
    try:
        dom.screenshot(path=path_out, full_page=full, animations="disabled")
    except Exception as e:
        signals["screenshot_error"] = str(e)[:150]
    if extra_screenshots:
        for i, sel in enumerate(extra_screenshots):
            try:
                el = dom.query_selector(sel)
                if el:
                    el.screenshot(path=os.path.join(OUT, f"{name}-snap-{i}.png"))
            except Exception:
                pass
    return signals


def focus_test(dom, name, n_tabs=8, timeout=90000):
    dom.goto(BASE + "/", wait_until="domcontentloaded", timeout=timeout)
    try:
        dom.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    time.sleep(0.6)
    try:
        for label in ["Aceitar", "Aceitar todos", "OK", "Entendi", "Concordo", "Entendido", "Continuar"]:
            try:
                btn = dom.get_by_role("button", name=label, exact=False)
                if btn.count() > 0:
                    btn.first.click()
                    time.sleep(0.35)
                    break
            except Exception:
                pass
    except Exception:
        pass
    states = []
    try:
        for i in range(n_tabs):
            dom.keyboard.press("Tab")
            states.append(dom.evaluate("() => { const a = document.activeElement; return a ? a.tagName + '#' + (a.id||'') : 'none'; }"))
        dom.screenshot(path=os.path.join(OUT, f"{name}-focus.png"))
    except Exception as e:
        states = ["ERR " + str(e)[:150]]
    return {"states": states, "focused_after": dom.evaluate("() => { const a = document.activeElement; return a ? a.tagName + '.' + (a.className||'').replace(/\\s+/g,'|') + '#' + (a.id||'') : 'none'; }"), "screenshot": f"{name}-focus.png"}


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge", headless=True)

        for vp_name, (w, h) in VP.items():
            ctx = browser.new_context(viewport={"width": w, "height": h}, locale="pt-BR")
            dom = ctx.new_page()
            for name, path in PAGES:
                res = audit(dom, path, name, vp_name)
                key = f"{name}-{vp_name}"
                results["pages"][key] = res
                errs = len(res.get("console_errors", []))
                print(f"{name}/{vp_name} {res.get('error','OK')} h1={str(res.get('h1',''))[:40]} imgs_no_alt={res.get('imgs_no_alt')} empty_state={str(res.get('empty_state'))[:60]} overflow_x={res.get('overflow_x')}")
            slug_info = None
            try:
                dom.goto(BASE + "/reviews/", wait_until="domcontentloaded", timeout=90000)
                try:
                    dom.wait_for_load_state("networkidle", timeout=20000)
                except Exception:
                    pass
                time.sleep(0.5)
                link = dom.eval_on_selector_all("main a, article a, a[href]",
                    "els => { for(const e of els){ const h = e.getAttribute('href'); if(h && h.includes('/reviews/') && !h.includes('categoria') && !h.includes('admin')){ return h; } } return null; }")
                if link:
                    slug_info = link if link.startswith("http") else BASE + link
                    res = audit(dom, slug_info, "review-article-slug", vp_name, extra_screenshots=[".verdict, .article"])
                    key = "review-article-slug-" + vp_name
                    results["pages"][key] = res
                    print(f"review-slug/{vp_name} {res.get('error','OK')} h1={str(res.get('h1',''))[:40]}")
            except Exception as e:
                print("slug discovery failed:", e)
            if vp_name == "desktop":
                try:
                    res = focus_test(dom, "home-focus")
                    results["notes"].append("focus_test_home: " + json.dumps(res, ensure_ascii=False)[:300])
                    print("focus-test:", res["states"][:12])
                    print("after:", res["focused_after"])
                except Exception as e:
                    print("focus test error:", e)
            ctx.close()

        ctx = browser.new_context(viewport=VP["desktop"], locale="pt-BR")
        dom = ctx.new_page()
        res = audit(dom, "/", "cookie-banner-firstvisit", "desktop")
        results["pages"]["cookie-banner-firstvisit-desktop"] = res
        try:
            dom.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
        time.sleep(0.5)
        dom.screenshot(path=os.path.join(OUT, "cookie-banner-firstvisit-snap.png"))
        btns = dom.evaluate("() => [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(t=>t).slice(0,6)")
        results["notes"].append("cookie_banner_buttons: " + json.dumps(btns))
        ctx.close()

        for vp_name in ["desktop", "mobile"]:
            ctx = browser.new_context(viewport=VP[vp_name], locale="pt-BR")
            dom = ctx.new_page()
            res = audit(dom, "/admin/login/", "admin-login", vp_name)
            results["pages"][f"admin-login-{vp_name}"] = res
            print(f"admin-login {vp_name} {res.get('error','OK')} h1={str(res.get('h1',''))[:40]}")
            ctx.close()

        ctx = browser.new_context(viewport=VP["desktop"], locale="pt-BR")
        dom = ctx.new_page()
        login_ok = False
        try:
            dom.goto(BASE + "/admin/login/", wait_until="domcontentloaded", timeout=90000)
            try:
                dom.wait_for_load_state("networkidle", timeout=20000)
            except Exception:
                pass
            if password:
                dom.fill("input[type='password']", password)
                dom.click("button[type='submit']")
                dom.wait_for_url("**/admin", timeout=30000)
                login_ok = True
                print("admin login: OK")
            else:
                print("ADMIN_PASSWORD not set")
        except Exception as e:
            print("admin login failed:", str(e)[:250])

        if login_ok:
            for name, path in ADMIN_PAGES:
                res = audit(dom, path, name, "desktop")
                results["pages"][name] = res
                h1 = res.get("h1")
                print(f"{name} errs={len(res.get('console_errors',[]))} h1={str(h1)[:45]} empty_main={res.get('empty_main')}")
            ctx_m = browser.new_context(viewport=VP["mobile"], locale="pt-BR")
            ctx_m.add_cookies(ctx.cookies())
            dom_m = ctx_m.new_page()
            for name, path in [("admin-dashboard", "/admin"), ("admin-reviews", "/admin/reviews"), ("admin-oportunidades", "/admin/oportunidades")]:
                res = audit(dom_m, path, name, "mobile", extra_screenshots=["main"])
                results["pages"][f"{name}-mobile"] = res
                print(f"{name} mobile errs={len(res.get('console_errors',[]))} h1={str(res.get('h1',''))[:40]}")
            ctx_m.close()

        browser.close()

    with open(RESULT, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("WROTE", RESULT)


if __name__ == "__main__":
    main()
