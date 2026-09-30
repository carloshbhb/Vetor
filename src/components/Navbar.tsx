"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const megaMenuData = [
  {
    label: "Reviews",
    href: "/reviews",
    items: [
      { label: "Smartphones", href: "/reviews/categoria/Smartphones", count: 24 },
      { label: "Fones de Ouvido", href: "/reviews/categoria/Fones de Ouvido", count: 18 },
      { label: "Wearables", href: "/reviews/categoria/Wearables", count: 12 },
      { label: "Notebooks", href: "/reviews/categoria/Notebooks", count: 8 },
    ],
  },
  {
    label: "Comparativos",
    href: "/comparativos",
    items: [
      { label: "Melhor Fone Bluetooth 2026", href: "/comparativos/melhor-fone-bluetooth-2026", badge: "P1" },
      { label: "Melhor Smartwatch Custo-Benefício", href: "/comparativos/melhor-smartwatch-custo-beneficio", badge: "P1" },
      { label: "Melhor Celular Custo-Benefício", href: "/comparativos/melhor-celular-custo-beneficio", badge: "P1" },
    ],
  },
  {
    label: "Categorias",
    href: "/reviews",
    items: [
      { label: "Áudio", href: "/reviews/categoria/Áudio", count: 15 },
      { label: "Casa Inteligente", href: "/reviews/categoria/Casa Inteligente", count: 10 },
      { label: "Periféricos", href: "/reviews/categoria/Periféricos", count: 8 },
      { label: "Componentes", href: "/reviews/categoria/Componentes", count: 6 },
    ],
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const navbarRef = useRef<HTMLHeaderElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const isScrollingDown = currentScrollY > lastScrollY.current;
          const isAtTop = currentScrollY < 50;
          
          if (isAtTop) {
            setScrolled(false);
          } else if (isScrollingDown) {
            setScrolled(true);
          } else {
            setScrolled(false);
          }
          
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      };
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMenuEnter = (label: string) => {
    setHoveredMenu(label);
  };

  const handleMenuLeave = () => {
    setHoveredMenu(null);
  };

  return (
    <>
      <header 
        ref={navbarRef}
        className={`navbar ${scrolled ? "scrolled" : ""} ${!scrolled && window.scrollY > 100 ? "revealed" : ""}`}
        onMouseEnter={() => setScrolled(false)}
        onMouseLeave={() => {
          if (window.scrollY > 100) setScrolled(true);
        }}
      >
        <div className="navbar-inner">
          <Link href="/" className="navbar-logo">
            vetor<span>.blog</span>
          </Link>

          <nav className="navbar-links" role="menubar">
            {megaMenuData.map((menu) => (
              <div 
                key={menu.label}
                className="nav-item"
                onMouseEnter={() => handleMenuEnter(menu.label)}
                onMouseLeave={handleMenuLeave}
                role="menuitem"
              >
                <Link 
                  href={menu.href} 
                  className="nav-link"
                  role="menuitem"
                  onMouseEnter={() => handleMenuEnter(menu.label)}
                >
                  {menu.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s" }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </Link>
                
                <div className="mega-menu" role="menu">
                  {menu.items.map((item) => (
                    <div key={item.href} className="mega-column" role="none">
                      <span className="mega-title" role="none">{menu.label}</span>
                      <ul className="mega-list" role="none">
                        <li role="none">
                          <Link 
                            href={item.href} 
                            className="magnetic"
                            data-magnetic="true"
                            onMouseOver={(e) => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.transform = "translateX(4px)";
                            }}
                            onMouseOut={(e) => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.transform = "translateX(0)";
                            }}
                            role="menuitem"
                          >
                            {item.label}
                            {item.badge && <span className="mega-badge">{item.badge}</span>}
                            {item.count && <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>{item.count} reviews</span>}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <Link href="/reviews" className="navbar-cta magnetic" data-magnetic="true">
            Ver Reviews
          </Link>

          <button
            type="button"
            className={`navbar-burger${open ? " open" : ""}`}
            onClick={() => setOpen(!open)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`navbar-mobile${open ? " open" : ""}`} role="dialog" aria-label="Menu de navegação">
          <nav className="container" style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 16 }}>
            {megaMenuData.flatMap((menu) => [
              <div key={`${menu.label}-divider`} style={{ 
                padding: "12px 0 4px", 
                fontFamily: "var(--font-heading)", 
                fontSize: "0.65rem", 
                fontWeight: 700, 
                letterSpacing: "0.08em", 
                textTransform: "uppercase", 
                color: "var(--blue)" 
              }}>
                {menu.label}
              </div>,
              ...menu.items.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className="navbar-mobile-link" 
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                  {item.badge && <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--amber)", background: "rgba(149,100,0,0.1)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>{item.badge}</span>}
                </Link>
              ))
            ])}
          </nav>
        </div>
      </header>
    </>
  );
}