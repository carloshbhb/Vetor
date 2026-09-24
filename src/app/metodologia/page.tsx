import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Metodologia de Review — Como Avaliamos Produtos",
  description:
    "Como fazemos os reviews do vetor.blog: critérios públicos, notas de 0 a 10, prós e contras e independência em relação a afiliados e patrocínios.",
  alternates: { canonical: "/metodologia" },
};

export default function MetodologiaPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Metodologia" }]} />
            <span className="sec-label">Como avaliamos</span>
            <h1 className="sec-h">METODOLOGIA DE REVIEW</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Notas com critérios claros, prós e cons sem filtro — e zero influência de patrocínio na pontuação.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <article style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Cada produto passa pelo mesmo processo. Começamos pela proposta de valor do produto: para
                quem ele foi feito, o que promete e em qual faixa de preço compete. Em seguida, avaliamos
                critérios objetivos — desempenho, construção, recursos, custo-benefício e experiência real
                de uso — comparando com concorrentes diretos na mesma categoria.
              </p>

              <h2 className="sec-h" style={{ fontSize: "1.4rem" }}>Notas de 0 a 10</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                O veredicto final usa escala de 0 a 10. Notas 8.0 ou maior significam forte recomendação;
                entre 5.0 e 7.9, o produto é uma opção razoável com ressalvas; abaixo de 5.0, não
                recomendamos. Quando aplicável, mostramos a nota detalhada por critério (barras de nota)
                para você ver onde o produto ganha e onde perde.
              </p>

              <h2 className="sec-h" style={{ fontSize: "1.4rem" }}>Prós e contras</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Todo review traz seções de prós e contras. Escrevemos os contras com a mesma franqueza
                dos prós: se o produto tem defeito recorrente, limitação de bateria ou acabamento fraco,
                isso aparece. Um review sem contras é um anúncio, não uma análise.
              </p>

              <h2 className="sec-h" style={{ fontSize: "1.4rem" }}>Independência e afiliados</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Não vendemos notas. Fabricantes não pagam para entrar em reviews nem para alterar conteúdo
                já publicado. Alguns botões de compra são links de afiliados: se você comprar por eles,
                recebemos uma comissão do lojista, sem custo adicional para você. Essa comissão não muda
                critérios, notas nem veredicto. Quando um review for atualizado, o conteúdo é revisado com
                os mesmos critérios originais.
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Encontrou um erro ou discorda de alguma análise? Nos avise pela página de{" "}
                <a href="/contato" style={{ color: "var(--blue)" }}>contato</a> — corrigimos quando há
                dados errados.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
