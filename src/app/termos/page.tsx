import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Termos de uso — Vetor.blog",
  description: "Termos de uso do Vetor.blog: conteúdo informativo, preços, afiliados e responsabilidades.",
  alternates: { canonical: "https://www.vetor.blog/termos" },
};

export default function TermosPage() {
  return (
    <main id="conteudo">
      <section className="hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Termos" }]} />
          <span className="eyebrow">Legal</span>
          <h1>Termos de uso</h1>
          <p className="hero-lead">As regras básicas para usar o conteúdo do Vetor.blog.</p>
        </div>
      </section>

      <section className="content-wrap">
        <div className="container">
          <article className="article">
            <h2>1. Conteúdo informativo</h2>
            <p>
              Reviews, comparativos, guias e ofertas têm caráter informativo e opinativo. Não constituem
              garantia de desempenho, preço ou disponibilidade de nenhum produto ou serviço.
            </p>

            <h2>2. Preços e disponibilidade</h2>
            <p>
              Preços, promoções e estoque exibidos são os verificados na data indicada em cada página e podem
              mudar sem aviso. O valor válido é sempre o exibido pela loja no momento da compra.
            </p>

            <h2>3. Links externos e afiliados</h2>
            <p>
              Ao clicar em links de compra, você sai do Vetor.blog e passa a estar sujeito aos termos da loja
              de destino. Links de afiliado podem gerar comissão ao blog, conforme a{" "}
              <a href="/afiliados/">política de afiliados</a>, sem custo adicional para você.
            </p>

            <h2>4. Propriedade intelectual</h2>
            <p>
              Textos, notas e organização do conteúdo pertencem ao Vetor.blog. É permitido citar trechos com
              crédito e link para a página original. Reprodução integral sem autorização não é permitida.
            </p>

            <h2>5. Privacidade</h2>
            <p>
              O tratamento de dados segue a nossa <a href="/privacidade/">Política de Privacidade</a>.
            </p>

            <h2>6. Contato</h2>
            <p>
              Dúvidas sobre estes termos? Fale pela página de <a href="/contato/">contato</a>.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
