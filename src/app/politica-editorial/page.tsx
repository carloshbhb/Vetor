import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";

export const metadata: Metadata = {
  title: "Política editorial — Vetor.blog",
  description:
    "Independência, correções, uso de dados e limites do conteúdo: a política editorial do Vetor.blog.",
  alternates: { canonical: "/politica-editorial/" },
};

export default function PoliticaEditorialPage() {
  return (
    <BreadcrumbSchema items={[{ name: 'Início', url: 'https://www.vetor.blog/' }, { name: 'Política editorial', url: 'https://www.vetor.blog/politica-editorial/' }]} />
    <main id="conteudo">
      <section className="hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Política editorial" }]} />
          <span className="eyebrow">Transparência</span>
          <h1>Política editorial</h1>
          <p className="hero-lead">As regras que seguimos para publicar reviews, comparativos e guias.</p>
        </div>
      </section>

      <section className="content-wrap">
        <div className="container">
          <article className="article">
            <h2>1. Independência acima de tudo</h2>
            <p>
              Nenhum anunciante, loja ou fabricante paga por notas, posições em rankings, comparativos ou pela
              omissão de defeitos. A equipe editorial decide o veredicto sem interferência comercial.
            </p>

            <h2>2. Sem avaliação inventada</h2>
            <p>
              Não publicamos nota, teste ou experiência que não tenha base real. Quando há teste prático do
              produto, a metodologia e as condições estão descritas na página. Quando a análise é documental,
              dizemos "analisamos" — nunca "testamos".
            </p>

            <h2>3. Correções transparentes</h2>
            <p>
              Erros de fato (preço, especificação, disponibilidade) são corrigidos assim que identificados, e a
              data de atualização da página reflete a correção. Mudanças de opinião editorial são explicadas no
              próprio texto quando relevantes.
            </p>

            <h2>4. Afiliados identificados</h2>
            <p>
              Links de afiliado carregam identificação visual e técnica (`sponsored`) e são explicados na{" "}
              <a href="/afiliados/">política de afiliados</a>. A existência de comissão nunca altera nota,
              ranking ou recomendação.
            </p>

            <h2>5. Atualização de conteúdo</h2>
            <p>
              Reviews e guias trazem a data da última atualização. Preços são uma fotografia do momento da
              checagem — a loja sempre tem a palavra final. Veja também <a href="/como-avaliamos/">como
              avaliamos</a>.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
