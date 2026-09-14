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
    <header className="sticky top-0 z-200 bg-bg/90 backdrop-blur-xl border-b border-border" style={{ height: 64 }}>
      <div className="container flex items-center justify-between h-16 gap-8">
        <Link href="/" className="font-display text-2xl tracking-wider text-text flex items-center gap-2 shrink-0">
          vetor
          <span className="bg-amber text-black font-heading font-extrabold text-[0.6rem] tracking-wider px-1.5 py-0.5 rounded">
            BLOG
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-heading text-[0.78rem] font-semibold tracking-wide text-muted hover:text-text transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          <span className={`block w-6 h-0.5 bg-text transition-all duration-300 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-text transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-text transition-all duration-300 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-60" : "max-h-0"}`}>
        <nav className="container flex flex-col gap-1 pb-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 px-3 rounded-lg text-muted hover:bg-surface2 hover:text-text transition-colors text-sm font-heading font-semibold"
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