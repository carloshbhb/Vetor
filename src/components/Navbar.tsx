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

  // Scroll-reactive behavior: hide on scroll down, reveal on scroll up
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

  // Mega menu hover
  const handleMenuEnter = (label: string) => {
    setHoveredMenu(label);
  };

  const handleMenuLeave = () => {
    setHoveredMenu(null);
  };

  return (
    <>
      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                      box-shadow 0.2s, 
                      background 0.2s,
                      border-color 0.2s;
          will-change: transform, box-shadow, background;
        }
        
        .navbar.scrolled {
          transform: translateY(-100%);
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        
        .navbar.revealed {
          transform: translateY(0);
        }
        
        .navbar-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 32px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }
        
        .navbar-logo {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 300;
          color: var(--ink);
          text-decoration: none;
          letter-spacing: -0.02em;
          flex-shrink: 0;
        }
        .navbar-logo span { color: var(--blue); font-weight: 500; }
        
        .navbar-links {
          display: flex;
          align-items: center;
          gap: 8px;
          list-style: none;
        }
        
        .nav-item {
          position: relative;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--body);
          text-decoration: none;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
          text-transform: uppercase;
        }
        .nav-link:hover { color: var(--ink); background: var(--surface); }
        .nav-link:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
        
        .mega-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          min-width: 600px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0 0 16px 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.12);
          padding: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px);
          transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
          z-index: 1001;
        }
        .nav-item:hover .mega-menu,
        .nav-item:focus-within .mega-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .mega-column { padding: 8px 0; }
        .mega-title {
          font-family: var(--font-heading);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .mega-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .mega-list a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--body);
          text-decoration: none;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .mega-list a:hover { color: var(--blue); background: var(--blue-lt); }
        .mega-badge {
          font-family: var(--font-heading);
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--amber);
          background: rgba(149,100,0,0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .navbar-cta {
          background: var(--cta);
          color: #fff;
          padding: 10px 24px;
          border-radius: 6px;
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 0.8rem;
          letter-spacing: 0.03em;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .navbar-cta:hover { background: var(--cta-dk); transform: scale(1.02); }
        .navbar-cta:active { transform: scale(0.98); }
        
        .navbar-burger {
          display: none;
          width: 32px;
          height: 24px;
          position: relative;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .navbar-burger span {
          display: block;
          width: 100%;
          height: 2px;
          background: var(--ink);
          position: absolute;
          left: 0;
          transition: transform 0.2s, opacity 0.2s, top 0.2s;
        }
        .navbar-burger span:nth-child(1) { top: 0; }
        .navbar-burger span:nth-child(2) { top: 50%; transform: translateY(-50%); }
        .navbar-burger span:nth-child(3) { bottom: 0; }
        .navbar-burger.open span:nth-child(1) { top: 50%; transform: translateY(-50%) rotate(45deg); }
        .navbar-burger.open span:nth-child(2) { opacity: 0; }
        .navbar-burger.open span:nth-child(3) { bottom: 50%; transform: translateY(50%) rotate(-45deg); }
        
        .navbar-mobile {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 16px 32px;
          transform: translateY(-100%);
          opacity: 0;
          visibility: hidden;
          transition: transform 0.3s, opacity 0.3s, visibility 0.3s;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .navbar-mobile.open {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }
        .navbar-mobile-link {
          display: block;
          padding: 14px 0;
          font-family: var(--font-heading);
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--ink);
          text-decoration: none;
          border-bottom: 1px solid var(--border);
          transition: color 0.15s, padding-left 0.2s;
        }
        .navbar-mobile-link:hover { color: var(--blue); padding-left: 8px; }
        
        @media (max-width: 768px) {
          .navbar-links { display: none; }
          .navbar-cta { display: none; }
          .navbar-burger { display: block; }
        }
        
        /* Mega menu hover card style */
        .mega-list a .mega-preview {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid var(--border);
          transition: transform 0.3s;
        }
        .mega-list a:hover .mega-preview {
          transform: scale(1.1);
        }
      `}
    </style>

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
              
              {/* Mega Menu */}
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
  );
}