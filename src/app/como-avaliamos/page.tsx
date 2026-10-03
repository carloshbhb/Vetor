import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";

export const metadata: Metadata = {
  title: "Como avaliamos — Metodologia do Vetor.blog",
  description:
    "Critérios, notas de 0 a 10, checagem de preços e política de independência: entenda exatamente como o Vetor.blog avalia produtos.",
  alternates: { canonical: "/como-avaliamos/" },
};

export default function ComoAvaliamosPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Início', url: 'https://www.vetor.blog/' }, { name: 'Como avaliamos', url: 'https://www.vetor.blog/como-avaliamos/' }]} />
      <main id="conteudo">
      <section className="hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Como avaliamos" }]} />
          <span className="eyebrow">Metodologia</span>
          <h1>Como avaliamos</h1>
          <p className="hero-lead">
            Critérios abertos, notas explicadas e preços checados na data indicada — para você confiar no
            veredicto.
          </p>
        </div>
      </section>

      <section className="content-wrap">
        <div className="container">
          <article className="article">
            <h2>Critérios por categoria</h2>
            <p>Cada review considera os pontos que mais influenciam a decisão de compra naquela categoria:</p>
            <ul>
              <li>
                <strong>Qualidade e recursos:</strong> o que o produto realmente entrega.
              </li>
              <li>
                <strong>Facilidade de uso:</strong> configuração, curva de aprendizado e experiência diária.
              </li>
              <li>
                <strong>Desempenho:</strong> velocidade, estabilidade e consistência quando aplicável.
              </li>
              <li>
                <strong>Preço:</strong> valor cobrado em relação ao que oferece.
              </li>
              <li>
                <strong>Concorrência:</strong> comparação com alternativas relevantes.
              </li>
              <li>
                <strong>Pós-compra:</strong> garantia, suporte e condições informadas pelo vendedor/fabricante.
              </li>
            </ul>

            <h2>Notas de 0 a 10</h2>
            <p>
              A nota final resume a avaliação nos critérios acima, ponderados pela proposta do produto. Notas
              iguais ou acima de 8 indicam recomendação forte; entre 5 e 8, uma opção razoável com ressalvas;
              abaixo de 5, recomendamos buscar alternativas. As notas por critério aparecem em barras em cada
              review.
            </p>

            <h2>Analisamos vs. testamos</h2>
            <p>
              Usamos "testamos" somente quando houve teste real do produto, com metodologia e condições
              descritas na página. Nos demais casos, dizemos "analisamos": cruzamos ficha técnica,
              documentação do fabricante, avaliações de compradores e comparação direta com concorrentes.
            </p>

            <h2>Preços e disponibilidade</h2>
            <p>
              Os preços exibidos são consultados na data indicada em cada página ("Preço checado em") e podem
              mudar a qualquer momento. Sempre confirme o valor final na loja antes de comprar.
            </p>

            <h2>Independência</h2>
            <p>
              Não aceitamos pagamento por notas, posições em ranking ou omissão de defeitos. Links de afiliado
              são identificados e não alteram a análise — leia a <a href="/afiliados/">política de afiliados</a>{" "}
              e a <a href="/politica-editorial/">política editorial</a>.
            </p>

            <h2>Atualizações e correções</h2>
            <p>
              Revisamos páginas quando preços, especificações ou o cenário de concorrentes mudam de forma
              relevante. Encontrou um erro? Avise pela página de <a href="/contato/">contato</a> — corrigimos e
              atualizamos a data da página.
            </p>
          </article>
        </div>
      </section>
      </main>
    </>
  );
}
