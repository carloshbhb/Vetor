"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { label: "Home", href: "/" },
  { label: "Reviews", href: "/reviews" },
  { label: "Comparativos", href: "/comparativos" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-200 bg-bg border-b border-border" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
      <div className="container flex items-center justify-between" style={{ height: 56, gap: 20 }}>
        <Link href="/" className="font-heading font-extrabold text-[0.9rem] tracking-tight text-blue shrink-0">
          vetor<span className="text-ink">.blog</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0 flex-1 justify-center">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-heading text-[0.75rem] font-bold tracking-[0.03em] text-body hover:text-blue transition-colors"
              style={{ padding: "0 16px", height: 56, lineHeight: "56px", borderBottom: "2.5px solid transparent" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/reviews"
          className="hidden md:inline-flex shrink-0 bg-cta text-white font-heading font-extrabold text-[0.76rem] tracking-[0.03em] px-5 py-2.5 rounded-md transition-colors hover:bg-cta-dk"
        >
          Ver Reviews
        </Link>

        <button
          type="button"
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          <span className={`block w-6 h-0.5 bg-ink transition-all duration-300 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-ink transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-ink transition-all duration-300 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-60" : "max-h-0"}`}>
        <nav className="container flex flex-col gap-1 pb-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 px-3 rounded-lg text-body hover:bg-surface hover:text-blue transition-colors text-sm font-heading font-semibold"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
