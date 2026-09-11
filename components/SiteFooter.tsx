import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg2 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="36" height="36" rx="9" fill="#1428A0" />
                <polygon points="8,10 14.5,10 18,22 21.5,10 28,10 19.5,27 16.5,27" fill="#4285F4" />
              </svg>
              <span className="font-syne font-bold text-lg text-text">vetor.blog</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Reviews sinceros e imparciais para compradores inteligentes. Análises detalhadas com dados reais.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-syne font-bold text-xs tracking-widest uppercase text-text-muted mb-4">Links</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><Link href="/" className="hover:text-blue transition-colors">Home</Link></li>
              <li><Link href="/sobre" className="hover:text-blue transition-colors">Sobre</Link></li>
              <li><Link href="/research" className="hover:text-blue transition-colors">Pesquisa de Mercado</Link></li>
              <li><Link href="/privacidade" className="hover:text-blue transition-colors">Privacidade</Link></li>
              <li><Link href="/termos" className="hover:text-blue transition-colors">Termos</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-syne font-bold text-xs tracking-widest uppercase text-text-muted mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><Link href="/sitemap.xml" className="hover:text-blue transition-colors">Sitemap</Link></li>
              <li><a href="/llms.txt" className="hover:text-blue transition-colors">llms.txt</a></li>
            </ul>
            <div className="flex items-center gap-3 mt-6">
              <a href="https://www.youtube.com/@VetorBlog" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-bg2 border border-border flex items-center justify-center text-text-muted hover:text-red hover:border-red transition-colors" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.46z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
              </a>
              <a href="https://github.com/carloshbhb/Vetor" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-bg2 border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-text transition-colors" aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6">
          <p className="text-xs text-text-muted text-center">
            Vetor.blog participa do programa de afiliados. Os preços e condições apresentados são promocionais e podem ser alterados sem aviso prévio. &copy; {new Date().getFullYear()} Vetor Blog.
          </p>
        </div>
      </div>
    </footer>
  );
}
