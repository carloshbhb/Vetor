import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Sobre o vetor.blog — Reviews Independentes em Português",
  description:
    "Conheça o vetor.blog: reviews independentes em português com a missão pare de comprar no escuro — dados, notas e transparência.",
  alternates: { canonical: "https://www.vetor.blog/sobre" },
};

export default function SobrePage() {
  return (
    <main id="conteudo">
      <section className="hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Sobre" }]} />
          <span className="eyebrow">Sobre nós</span>
          <h1>Sobre o Vetor.blog</h1>
          <p className="hero-lead">
            Pare de comprar no escuro. Reviews independentes, em português, com dados em vez de achismo.
          </p>
        </div>
      </section>

      <section className="content-wrap">
        <div className="container">
          <article className="article">
            <p>
              O vetor.blog existe para uma coisa: ajudar você a escolher produtos com confiança. Publicamos
              análises detalhadas de wearables, fones de ouvido, notebooks e outras categorias — sempre em
              português, sempre com o mesmo padrão de profundidade.
            </p>

            <h2>Nossa missão</h2>
            <p>
              <strong>Pare de comprar no escuro.</strong> Em vez de textos genéricos copiados da ficha técnica,
              cada review traz critérios claros, notas de 0 a 10, prós e contras honestos e um veredicto direto
              ao ponto. Se um produto é medíocre, nós dizemos.
            </p>

            <h2>Independência editorial</h2>
            <p>
              Somos independentes. Não aceitamos pagamento para dar notas altas nem para esconder defeitos.
              Alguns links de compra são de afiliados — quando você compra por eles, recebemos uma pequena
              comissão sem custo extra para você, o que nos ajuda a continuar publicando. A nota e o veredicto
              continuam sendo os mesmos, com ou sem afiliação.
            </p>

            <h2>Comparativos e metodologia</h2>
            <p>
              Também produzimos comparativos lado a lado para quem está na dúvida entre dois ou mais produtos.
              Quer entender exatamente como avaliamos? Tudo está descrito na nossa página de{" "}
              <a href="/como-avaliamos/">como avaliamos</a>.
            </p>

            <h2>Quem escreve</h2>
            <p>
              Os reviews são escritos e revisados pela nossa equipe editorial —{" "}
              <a href="/author/">conheça quem escreve</a>.
            </p>

            <h2>Fale com a gente</h2>
            <p>
              Dúvidas, sugestões ou correções? Fale com a gente na página de <a href="/contato/">contato</a>.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
