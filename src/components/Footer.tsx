import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link href="/" className="footer-brand">vetor.blog</Link>
        <p className="footer-text">
          Esta página contém links de afiliados. Caso você compre através deles, recebemos uma pequena comissão sem custo adicional para você. Isso nos ajuda a manter o site e continuar publicando reviews independentes.
        </p>
        <p className="footer-text">
          Os preços exibidos são indicativos e podem variar. Sempre confirme o valor final antes de concluir a compra.
        </p>
        <div className="footer-links">
          <Link href="#">Política de privacidade</Link>
          <Link href="#">Sobre o vetor.blog</Link>
          <Link href="#">Metodologia de review</Link>
          <Link href="#">Contato</Link>
        </div>
        <p className="footer-copy">© 2026 vetor.blog. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
