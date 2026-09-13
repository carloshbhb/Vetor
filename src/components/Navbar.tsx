"use client";

import { useState } from "react";

const links = [
  { label: "Home", href: "/" },
  { label: "Reviews", href: "/reviews" },
  { label: "Comparativos", href: "/reviews?category=comparativos" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0F1623]/90 backdrop-blur-md">
      <div className="container flex items-center justify-between py-5">
        <a href="/" className="text-2xl font-bold text-[var(--blue)]">
          vetor.blog
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          <span
            className={`block w-6 h-0.5 bg-[var(--text)] transition-all duration-300 ${
              open ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-[var(--text)] transition-all duration-300 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-[var(--text)] transition-all duration-300 ${
              open ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? "max-h-60" : "max-h-0"
        }`}
      >
        <nav className="container flex flex-col gap-1 pb-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="py-2 px-3 rounded-lg text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] transition-colors duration-200 text-sm"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
