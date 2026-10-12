# -*- coding: utf-8 -*-
"""UX audit capture: public site + admin panel screenshots + console errors."""
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens")
os.makedirs(OUT, exist_ok=True)

# Read ADMIN_PASSWORD from .env.local without printing it
password = None
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env.local"), "r", encoding="utf-8", errors="replace") as f:
    for line in f:
        m = re.match(r"^ADMIN_PASSWORD=(.*)$", line.strip())
        if m:
            password = m.group(1).strip().strip('"').strip("'")
            break

VIEWPORTS = {
    "desktop": {"width": 1280, "height": 900},
    "tablet": {"width": 768, "height": 1024},
    "mobile": {"width": 375, "height": 812},
}

PUBLIC_PAGES = [
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

results = {"pages": {}, "notes": []}


def audit_page(page, name, path, viewport_name, tag, full=True):
    """Load a page, capture screenshot, console errors, overflow."""
    entry = {"url": BASE + path, "viewport": viewport_name, "console_errors": [], "failed_requests": [], "overflow_x": False}
    page.on("console", lambda msg: entry["console_errors"].append(msg.text[:300]) if msg.type == "error" else None)
    page.on("pageerror", lambda err: entry["console_errors"].append("PAGEERROR: " + str(err)[:300]))
    page.on("requestfailed", lambda req: entry["failed_requests"].append(f"{req.url[:200]} :: {req.failure}") if req.failure else None)
    try:
        page.goto(BASE + path, wait_until="domcontentloaded", timeout=90000)
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            entry["notes"] = "networkidle timeout (dev compile?)"
    except Exception as e:
        entry["error"] = f"goto failed: {str(e)[:200]}"
        results["pages"][f"{name}-{tag}"] = entry
        return None
    time.sleep(1.0)
    # horizontal overflow check
    try:
        ow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        entry["overflow_x"] = bool(ow)
    except Exception:
        pass
    fname = os.path.join(OUT, f"{name}-{tag}.png")
    try:
        page.screenshot(path=fname, full_page=full)
    except Exception as e:
        entry["screenshot_error"] = str(e)[:200]
    results["pages"][f"{name}-{tag}"] = entry
    return entry


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)

        # ---------- PUBLIC SITE ----------
        for vp_name, vp in VIEWPORTS.items():
            ctx = browser.new_context(viewport=vp, locale="pt-BR")
            page = ctx.new_page()
            for name, path in PUBLIC_PAGES:
                audit_page(page, name, path, vp_name, vp_name)
            if vp_name == "desktop":
                # discover a review slug from reviews list
                try:
                    page.goto(BASE + "/reviews/", wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_load_state("networkidle", timeout=20000)
                    link = page.eval_on_selector_all(
                        "main a[href*='/reviews/'], a[href*='/reviews/']",
                        "els => { for (const el of els) { const h = el.getAttribute('href'); if (h && /\\/reviews\\/[a-z0-9-]{8,}/.test(h) && !h.includes('categoria') && !h.endsWith('/reviews/')) return h; } return null; }",
                    )
                    if link:
                        results["notes"].append(f"discovered review slug: {link}")
                        audit_page(page, "review-article", link if link.startswith("http") else BASE + link, "desktop", "desktop")
                except Exception as e:
                    results["notes"].append(f"slug discovery failed: {e}")
                # empty search results
                audit_page(page, "busca-vazia", "/busca/?q=zzzqwxnaoexiste", "desktop", "desktop")
                audit_page(page, "busca-populada", "/busca/?q=smartwatch", "desktop", "desktop")
            ctx.close()

        # cookie banner first-visit capture (fresh context, desktop)
        ctx = browser.new_context(viewport=VIEWPORTS["desktop"], locale="pt-BR")
        page = ctx.new_page()
        page.goto(BASE + "/", wait_until="domcontentloaded", timeout=90000)
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
        time.sleep(1.2)
        page.screenshot(path=os.path.join(OUT, "cookie-banner-firstvisit.png"))
        # find banner element and its buttons
        try:
            banner_txt = page.evaluate("""() => {
                const els = [...document.querySelectorAll('button')];
                return els.map(b => b.innerText.trim()).filter(t => t && t.length < 40);
            }""")
            results["notes"].append(f"buttons on first visit: {banner_txt}")
        except Exception:
            pass
        ctx.close()

        # keyboard focus visibility test on home (desktop)
        ctx = browser.new_context(viewport=VIEWPORTS["desktop"], locale="pt-BR")
        page = ctx.new_page()
        page.goto(BASE + "/", wait_until="domcontentloaded", timeout=90000)
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
        # dismiss cookie banner if present by clicking common accept buttons
        for label in ["Aceitar", "Aceitar todos", "OK", "Entendi", "Concordo"]:
            try:
                btn = page.get_by_role("button", name=label, exact=False)
                if btn.count() > 0:
                    btn.first.click()
                    time.sleep(0.4)
                    break
            except Exception:
                pass
        try:
            for _ in range(6):
                page.keyboard.press("Tab")
            time.sleep(0.3)
            page.screenshot(path=os.path.join(OUT, "focus-test-home.png"))
            focused = page.evaluate("() => document.activeElement ? document.activeElement.tagName + '.' + (document.activeElement.className||'') + '#' + (document.activeElement.id||'') : 'none'")
            results["notes"].append(f"focused after 6 tabs: {focused}")
        except Exception as e:
            results["notes"].append(f"focus test failed: {e}")
        ctx.close()

        # ---------- ADMIN ----------
        # login page (logged out), desktop + mobile
        for vp_name in ["desktop", "mobile"]:
            ctx = browser.new_context(viewport=VIEWPORTS[vp_name], locale="pt-BR")
            page = ctx.new_page()
            audit_page(page, "admin-login", "/admin/login/", vp_name, vp_name)
            ctx.close()

        # login via real form (desktop) and audit admin pages
        ctx = browser.new_context(viewport=VIEWPORTS["desktop"], locale="pt-BR")
        page = ctx.new_page()
        login_ok = False
        try:
            page.goto(BASE + "/admin/login/", wait_until="domcontentloaded", timeout=90000)
            page.wait_for_load_state("networkidle", timeout=20000)
            if password:
                page.fill("input[type='password']", password)
                page.click("button[type='submit']")
                page.wait_for_url("**/admin", timeout=30000)
                login_ok = True
                results["notes"].append("admin login via form: OK")
            else:
                results["notes"].append("ADMIN_PASSWORD not found in .env.local")
        except Exception as e:
            results["notes"].append(f"admin login failed: {str(e)[:200]}")
            try:
                page.screenshot(path=os.path.join(OUT, "admin-login-failed.png"))
            except Exception:
                pass

        if login_ok:
            for name, path in ADMIN_PAGES:
                audit_page(page, name, path, "desktop", "desktop")
            # mobile for key admin pages
            ctx_m = browser.new_context(viewport=VIEWPORTS["mobile"], locale="pt-BR")
            # reuse login cookie
            cookies = ctx.cookies()
            ctx_m.add_cookies(cookies)
            page_m = ctx_m.new_page()
            for name, path in [("admin-dashboard", "/admin"), ("admin-reviews", "/admin/reviews"), ("admin-oportunidades", "/admin/oportunidades")]:
                audit_page(page_m, name, path, "mobile", "mobile")
            ctx_m.close()
        ctx.close()

        browser.close()

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capture-results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("DONE. results at", out_path)
    for k, v in results["pages"].items():
        errs = len(v.get("console_errors", [])) + len(v.get("failed_requests", []))
        flag = "OVERFLOW-X!" if v.get("overflow_x") else ""
        err = v.get("error", "")
        print(f"{k}: console/req errors={errs} {flag} {err}")


if __name__ == "__main__":
    main()
