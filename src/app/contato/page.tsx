import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Contato — Fale com a Redação do vetor.blog",
  description:
    "Entre em contato com o vetor.blog: dúvidas, correções, sugestões de reviews e parcerios de conteúdo.",
  alternates: { canonical: "/contato" },
};

export default function ContatoPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Contato" }]} />
            <span className="sec-label">Fale conosco</span>
            <h1 className="sec-h">CONTATO</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Dúvidas, correções ou sugestões de review? Escreva para a gente.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <article style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                A melhor forma de falar com o vetor.blog é por e-mail. Respondemos mensagens sobre reviews,
                correções de dados, sugestões de produtos para analisar e assuntos gerais do site.
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                <a
                  href="mailto:contato@vetor.blog"
                  className="btn-cta"
                  style={{ display: "inline-block", textDecoration: "none" }}
                >
                  contato@vetor.blog
                </a>
              </p>

              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Se você encontrou um erro em um review (preço desatualizado, especificação incorreta ou
                link quebrado), indique o endereço da página na mensagem para que possamos corrigir mais
                rápido.
              </p>

              <p style={{ color: "var(--muted)", fontWeight: 300, lineHeight: 1.8, fontSize: "0.9rem" }}>
                Para entender como tratamos seus dados, veja a{" "}
                <a href="/privacidade" style={{ color: "var(--blue)" }}>política de privacidade</a>.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
