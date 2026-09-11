'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-text-muted">
          <Link href="/" className="hover:text-text transition-colors">Reviews</Link>
          <Link href="/research" className="hover:text-text transition-colors">Pesquisa</Link>
          <Link href="/sobre" className="hover:text-text transition-colors">Sobre</Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-bg2 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Menu de navegação"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-white">
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link
              href="/"
              className="px-4 py-3 rounded-lg text-sm font-medium text-text hover:bg-bg2 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Reviews
            </Link>
            <Link
              href="/research"
              className="px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:bg-bg2 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Pesquisa de Mercado
            </Link>
            <Link
              href="/sobre"
              className="px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:bg-bg2 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Sobre
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
