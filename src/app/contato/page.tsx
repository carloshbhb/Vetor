import type { Metadata } from "next";
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
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Contato" }]} />
            <span className="eyebrow">Fale conosco</span>
            <h1>Contato</h1>
            <p className="hero-lead">Dúvidas, correções ou sugestões de review? Escreva para a gente.</p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <article className="article">
              <p>
                A melhor forma de falar com o vetor.blog é por e-mail. Respondemos mensagens sobre reviews,
                correções de dados, sugestões de produtos para analisar e assuntos gerais do site.
              </p>

              <p>
                <a href="mailto:contato@vetor.blog" className="cta" style={{ maxWidth: 320 }}>
                  contato@vetor.blog
                </a>
              </p>

              <p>
                Se você encontrou um erro em um review (preço desatualizado, especificação incorreta ou link
                quebrado), indique o endereço da página na mensagem para que possamos corrigir mais rápido.
              </p>

              <p>
                Para entender como tratamos seus dados, veja a{" "}
                <a href="/privacidade">política de privacidade</a>.
              </p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
