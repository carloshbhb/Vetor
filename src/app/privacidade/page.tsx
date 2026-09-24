import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Política de Privacidade — vetor.blog",
  description:
    "Política de privacidade do vetor.blog: como tratamos dados, cookies, links de afiliados e suas opções de contato.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Política de privacidade" }]} />
            <span className="sec-label">Transparência</span>
            <h1 className="sec-h">POLÍTICA DE PRIVACIDADE</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Como coletamos, usamos e protegemos informações neste site — sem letras miúdas escondidas.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <article style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Esta página explica como o vetor.blog trata dados de quem visita o site. Resumimos o essencial
                em linguagem direta: o site público é estático, não pede cadastro e não exige login para ler
                os reviews.
              </p>

              <h2 className="sec-h" style={{ fontSize: "1.4rem" }}>Cookies</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                As páginas públicas do vetor.blog não usam cookies de rastreamento ou publicidade. Cookies
                só entram em jogo na área administrativa, onde são necessários para manter a sessão de
                quem edita o conteúdo. Ao navegar normalmente no site, nenhum cookie seu é armazenado por nós.
              </p>

              <h2 className="sec-h" style={{ fontSize: "1.4rem" }}>Links de afiliados</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Alguns links de compra são links de afiliados. Se você comprar por eles, podemos receber uma
                comissão do lojista, sem custo adicional para você. Isso ajuda a manter o site. A criação de
                um link de afiliado não influence nossas notas nem nossos veredictos — a metodologia está
                descrita na página de <a href="/metodologia" style={{ color: "var(--blue)" }}>metodologia</a>.
              </p>

              <h2 className="sec-h" style={{ fontSize: "1.4rem" }}>Dados armazenados</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                O conteúdo do site (reviews e comparativos) é armazenado em um banco de dados Supabase.
                Não coletamos nome, e-mail ou dados de pagamento de leitores no site público. Não utilizamos
                Google Analytics nem outras ferramentas de análise de terceiros nas páginas públicas no
                momento desta publicação.
              </p>

              <h2 className="sec-h" style={{ fontSize: "1.4rem" }}>Seus direitos</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                Se por algum motivo precisar exercer um direito relacionado a dados pessoais (LGPD) ou tiver
                dúvidas sobre esta política, fale conosco pela página de <a href="/contato" style={{ color: "var(--blue)" }}>contato</a>.
                Respondemos em um prazo razoável.
              </p>

              <p style={{ color: "var(--muted)", fontWeight: 300, lineHeight: 1.8, fontSize: "0.9rem" }}>
                Última atualização: setembro de 2026.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
