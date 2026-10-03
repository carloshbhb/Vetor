export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav">
        <a className="brand" href="/" aria-label="Vetor.blog, página inicial">
          Vetor<span>.</span>blog
        </a>

        <nav className="nav-links" aria-label="Navegação principal">
          <a href="/reviews/">Reviews</a>
          <a href="/comparativos/">Comparativos</a>
          <a href="/melhores/">Melhores</a>
          <a href="/guias/">Guias</a>
          <a href="/ofertas/">Ofertas</a>
        </nav>

        <a className="header-cta" href="/reviews/">
          Ver reviews
        </a>
      </div>
    </header>
  );
}
