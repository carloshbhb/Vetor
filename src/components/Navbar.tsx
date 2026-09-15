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
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          vetor<span>.blog</span>
        </Link>

        <nav className="navbar-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="navbar-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/reviews" className="navbar-cta">
          Ver Reviews
        </Link>

        <button
          type="button"
          className={`navbar-burger${open ? " open" : ""}`}
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`navbar-mobile${open ? " open" : ""}`}>
        <nav className="container" style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 16 }}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="navbar-mobile-link" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
