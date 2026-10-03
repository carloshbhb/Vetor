export default function SiteFooter() {
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <a className="brand" href="/">
            Vetor<span>.</span>blog
          </a>
          <p>
            Reviews, comparativos e guias para ajudar você a entender melhor produtos,
            serviços e ofertas antes de comprar.
          </p>
          <p>
            Alguns links podem ser de afiliado. Preços, disponibilidade e condições devem
            ser confirmados no site do anunciante ou vendedor.
          </p>
        </div>

        <div className="footer-links">
          <a href="/reviews/">Reviews</a>
          <a href="/comparativos/">Comparativos</a>
          <a href="/guias/">Guias</a>
          <a href="/ofertas/">Ofertas</a>
          <a href="/sobre/">Sobre</a>
          <a href="/como-avaliamos/">Como avaliamos</a>
          <a href="/politica-editorial/">Política editorial</a>
          <a href="/afiliados/">Afiliados</a>
          <a href="/privacidade/">Privacidade</a>
          <a href="/termos/">Termos</a>
          <a href="/contato/">Contato</a>
        </div>
      </div>
    </footer>
  );
}
