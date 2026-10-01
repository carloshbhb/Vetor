import type { Metadata } from "next";
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
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Política de privacidade" }]} />
            <span className="eyebrow">Transparência</span>
            <h1>Política de privacidade</h1>
            <p className="hero-lead">
              Como coletamos, usamos e protegemos informações neste site — sem letras miúdas escondidas.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <article className="article">
              <p>
                Esta página explica como o vetor.blog trata dados de quem visita o site. Resumimos o essencial
                em linguagem direta: o site público não pede cadastro e não exige login para ler os reviews.
              </p>

              <h2>Medição de audiência</h2>
              <p>
                Utilizamos o Google Analytics 4 para métricas agregadas de audiência: páginas vistas, cliques
                em ofertas e profundidade de leitura. Esses dados são estatísticos, sem identificação nominal
                do visitante, e servem para decidir quais reviews e guias produzir.
              </p>

              <h2>Cookies</h2>
              <p>
                O Google Analytics armazena cookies próprios (como `_ga`) para distinguir visitas. Você pode
                bloquear cookies nas configurações do navegador — o site continua funcionando. Cookies de
                sessão adicionais existem apenas na área administrativa, para quem edita o conteúdo.
              </p>

              <h2>Links de afiliados</h2>
              <p>
                Alguns links de compra são links de afiliados. Se você comprar por eles, podemos receber uma
                comissão do lojista, sem custo adicional para você. Isso ajuda a manter o site. A criação de
                um link de afiliado não influencia nossas notas nem nossos veredictos — a metodologia está
                descrita na página de <a href="/metodologia">metodologia</a>.
              </p>

              <h2>Dados armazenados</h2>
              <p>
                O conteúdo do site (reviews e comparativos) é armazenado em um banco de dados Supabase. Não
                coletamos nome, e-mail ou dados de pagamento de leitores no site público — exceto o e-mail
                informado voluntariamente na newsletter, usado apenas para o envio semanal.
              </p>

              <h2>Seus direitos</h2>
              <p>
                Se por algum motivo precisar exercer um direito relacionado a dados pessoais (LGPD) ou tiver
                dúvidas sobre esta política, fale conosco pela página de <a href="/contato">contato</a>.
                Respondemos em um prazo razoável.
              </p>

              <p>Última atualização: outubro de 2026.</p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
