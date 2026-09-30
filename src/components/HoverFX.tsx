"use client";

import { useEffect } from "react";

function applyStyles(el: Element, attr: string) {
  const raw = el.getAttribute(attr);
  if (!raw) return;
  try {
    const styles = JSON.parse(raw) as Record<string, string>;
    if (!styles || typeof styles !== "object") return;
    const html = el as HTMLElement;
    for (const [prop, value] of Object.entries(styles)) {
      html.style.setProperty(prop, value);
    }
  } catch {
    return;
  }
}

export default function HoverFX() {
  useEffect(() => {
    let active: Element | null = null;

    const resolve = (e: Event): Element | null => {
      const target = e.target as Element | null;
      if (!target || typeof target.closest !== "function") return null;
      return target;
    };

    const onOver = (e: Event) => {
      const target = resolve(e);
      if (!target) return;
      const el = target.closest("[data-hover]");
      if (!el || el === active) return;
      if (active) applyStyles(active, "data-hover-base");
      active = el;
      applyStyles(el, "data-hover");
    };

    const onOut = (e: Event) => {
      if (!active) return;
      const related = (e as PointerEvent).relatedTarget as Node | null;
      if (related && active.contains(related)) return;
      applyStyles(active, "data-hover-base");
      active = null;
    };

    const onDown = (e: Event) => {
      const target = resolve(e);
      if (!target) return;
      const el = target.closest("[data-hover-down]");
      if (el) applyStyles(el, "data-hover-down");
    };

    const onUp = (e: Event) => {
      const target = resolve(e);
      if (!target) return;
      const el = target.closest("[data-hover-up]");
      if (el) applyStyles(el, "data-hover-up");
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);

    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  return null;
}
