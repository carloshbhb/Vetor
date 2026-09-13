"use client";

export default function Footer() {
  return (
    <footer className="border-t border-white/8 mt-20 pt-12 pb-8">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <a href="/" className="text-xl font-bold text-[var(--blue)] mb-4 block">
              vetor.blog
            </a>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Reviews profissionais, comparativos e recomendações de compra para
              você escolher com confiança.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wider">
              Navegação
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-sm text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/reviews" className="text-sm text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
                  Reviews
                </a>
              </li>
              <li>
                <a href="/reviews?category=comparativos" className="text-sm text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
                  Comparativos
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wider">
              Categorias
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/reviews?category=wearables" className="text-sm text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
                  Wearables
                </a>
              </li>
              <li>
                <a href="/reviews?category=fones-de-ouvido" className="text-sm text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
                  Fones de Ouvido
                </a>
              </li>
              <li>
                <a href="/reviews?category=notebooks" className="text-sm text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
                  Notebooks
                </a>
              </li>
              <li>
                <a href="/reviews?category=smartphones" className="text-sm text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
                  Smartphones
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wider">
              Newsletter
            </h3>
            <p className="text-sm text-[var(--muted)] mb-3">
              Receba os melhores reviews no seu email.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                placeholder="seu@email.com"
                className="flex-1 bg-[var(--surface2)] border border-white/8 rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--blue)]"
              />
              <button
                type="submit"
                className="bg-[var(--blue)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-4">
            <a href="#" aria-label="Twitter" className="text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" aria-label="Instagram" className="text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a href="#" aria-label="YouTube" className="text-[var(--muted)] hover:text-[var(--blue)] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-xs text-[var(--muted)]">
            <span>© 2026 vetor.blog — Todos os direitos reservados.</span>
            <a href="#" className="hover:text-[var(--text)] transition-colors">Termos</a>
            <a href="#" className="hover:text-[var(--text)] transition-colors">Privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
