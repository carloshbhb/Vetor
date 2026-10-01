import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Política de afiliados — Vetor.blog",
  description:
    "Como funcionam os links de afiliado do Vetor.blog: identificação, redirect /go/ e zero influência editorial.",
  alternates: { canonical: "https://www.vetor.blog/afiliados" },
};

export default function AfiliadosPage() {
  return (
    <main id="conteudo">
      <section className="hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Afiliados" }]} />
          <span className="eyebrow">Transparência</span>
          <h1>Política de afiliados</h1>
          <p className="hero-lead">
            Como os links de compra sustentam o blog — sem custo para você e sem influência na análise.
          </p>
        </div>
      </section>

      <section className="content-wrap">
        <div className="container">
          <article className="article">
            <h2>Como funciona</h2>
            <p>
              Algumas páginas do Vetor.blog contêm links de afiliado para lojas parceiras. Se você comprar por
              um desses links, o blog pode receber uma comissão — <strong>sem nenhum custo adicional para
              você</strong>. É assim que financiamos as análises sem cobrar pelo conteúdo.
            </p>

            <h2>Como identificar</h2>
            <p>Cada página com afiliação traz:</p>
            <ul>
              <li>
                <strong>Aviso de transparência</strong> no topo do conteúdo e no rodapé do site.
              </li>
              <li>
                <strong>Atributo técnico `sponsored`</strong> nos links, seguindo as diretrizes do Google.
              </li>
              <li>
                <strong>Redirect `/go/`</strong>: os botões de compra passam por um redirect interno, para que
                o destino possa ser atualizado em um só lugar se a oferta mudar.
              </li>
            </ul>

            <h2>Zero influência editorial</h2>
            <p>
              Comissão não compra nota, posição em ranking, comparativo favorável nem silêncio sobre defeitos.
              Produtos sem nenhum programa de afiliado são avaliados com o mesmo rigor — e recomendamos
              alternativas mesmo quando elas não geram comissão.
            </p>

            <h2>Preços e disponibilidade</h2>
            <p>
              Preços e estoque mudam o tempo todo. O valor exibido aqui é o da data de checagem indicada na
              página; o preço válido é sempre o da loja no momento da compra.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
