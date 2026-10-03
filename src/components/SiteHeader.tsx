import Link from 'next/link';
import SiteSearch from '@/components/SiteSearch';

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav" style={{ flexWrap: 'wrap', paddingBlock: 10 }}>
        <Link className="brand" href="/" aria-label="Vetor.blog, página inicial">
          Vetor<span>.</span>blog
        </Link>

        <nav className="nav-links" aria-label="Navegação principal">
          <Link href="/reviews/">Reviews</Link>
          <Link href="/comparativos/">Comparativos</Link>
          <Link href="/melhores/">Melhores</Link>
          <Link href="/guias/">Guias</Link>
          <Link href="/ofertas/">Ofertas</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 320px', justifyContent: 'flex-end' }}>
          <SiteSearch />
          <Link className="header-cta" href="/reviews/">
            Ver reviews
          </Link>
        </div>
      </div>
    </header>
  );
}
