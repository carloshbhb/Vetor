import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Sobre o vetor.blog — Reviews Independentes em Português",
  description:
    "Conheça o vetor.blog: reviews independentes em português com a missão \"Pare de comprar no escuro\" — dados, notas e transparência.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Sobre" }]} />
            <span className="sec-label">Sobre nós</span>
            <h1 className="sec-h">SOBRE O VETOR.BLOG</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Pare de comprar no escuro. Reviews independentes, em português, com dados em vez de achismo.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <article style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                O vetor.blog existe para uma coisa: ajudar você a escolher produtos com confiança. Publicamos
                análises detalhadas de wearables, fones de ouvido, notebooks e outras categorias — sempre em
                português, sempre com o mesmo padrão de profundidade.
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Nossa missão é simples: <strong style={{ color: "var(--ink)" }}>pare de comprar no escuro</strong>.
                Em vez de textos genéricos copiados da ficha técnica, cada review traz critérios claros,
                notas de 0 a 10, prós e contras honestos e um veredicto direto ao ponto. Se um produto é
                medíocre, nós dizemos.
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Somos independentes. Não aceitamos pagamento para dar notas altas nem para esconder defeitos.
                Alguns links de compra são de afiliados — quando você compra por eles, recebemos uma pequena
                comissão sem custo extra para você, o que nos ajuda a continuar publicando. A nota e o
                veredicto continuam sendo os mesmos, com ou sem afiliação.
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Também produzimos comparativos lado a lado para quem está na dúvida entre dois ou mais
                produtos. Quer entender exatamente como avaliamos? Tudo está descrito na nossa página de{" "}
                <a href="/metodologia" style={{ color: "var(--blue)" }}>metodologia de review</a>.
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Quem está por trás das análises? Os reviews são escritos e revisados pela nossa
                equipe editorial — <a href="/author" style={{ color: "var(--blue)" }}>conheça quem escreve</a>.
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Dúvidas, sugestões ou correções? Fale com a gente na página de{" "}
                <a href="/contato" style={{ color: "var(--blue)" }}>contato</a>.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
