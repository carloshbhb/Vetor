import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="36" height="36" rx="9" fill="#1428A0" />
              <polygon points="8,10 14.5,10 18,22 21.5,10 28,10 19.5,27 16.5,27" fill="#4285F4" />
            </svg>
            <span className="font-syne font-bold text-text">vetor.blog</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-text-muted">
            <Link href="/" className="hover:text-blue transition-colors">Home</Link>
            <Link href="/sobre" className="hover:text-blue transition-colors">Sobre</Link>
            <Link href="/research" className="hover:text-blue transition-colors">Pesquisa de Mercado</Link>
            <Link href="/privacidade" className="hover:text-blue transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-blue transition-colors">Termos</Link>
            <Link href="/sitemap.xml" className="hover:text-blue transition-colors">Sitemap</Link>
            <a href="/llms.txt" className="hover:text-blue transition-colors">llms.txt</a>
          </div>
        </div>
        <p className="text-xs text-text-muted text-center mt-4">
          Vetor.blog participa do programa de afiliados. Os preços e condições apresentados são promocionais e podem ser alterados sem aviso prévio. &copy; {new Date().getFullYear()} Vetor Blog.
        </p>
      </div>
    </footer>
  );
}
