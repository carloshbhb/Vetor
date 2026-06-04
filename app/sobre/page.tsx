import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre o Vetor Blog — Quem Somos',
  description: 'Conheça o Vetor Blog. Reviews independentes de produtos com testes reais e análises detalhadas.',
  robots: { index: true, follow: true },
};

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-2">Sobre o Vetor Blog</h1>
        <p className="text-text-muted text-sm mb-8">Reviews independentes com testes reais.</p>

        <div className="prose prose-lg max-w-none text-text-2 space-y-8">
          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">Nossa Missão</h2>
            <p>
              O <strong>Vetor Blog</strong> nasceu com o objetivo de ajudar consumidores a tomar decisões de compra mais inteligentes. Publicamos reviews detalhados e análises independentes de produtos, baseados em testes reais e pesquisa aprofundada.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">Como Trabalhamos</h2>
            <p>Cada review passa por um processo rigoroso:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Pesquisa de mercado:</strong> analisamos tendências, preços e o que os consumidores estão buscando</li>
              <li><strong>Análise técnica:</strong> especificações, comparativos e testes de desempenho</li>
              <li><strong>Avaliação honesta:</strong> prós e contras reais, sem influência de anunciantes</li>
              <li><strong>Atualização contínua:</strong> revisamos conteúdo quando há mudanças de preço ou lançamentos</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">Transparência</h2>
            <p>
              Nosso compromisso é com o leitor. Por isso:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Não aceitamos pagamentos por notas positivas</li>
              <li>Links de afiliados são claramente identificados</li>
              <li>Recomendações são baseadas em análise independente</li>
              <li>Atualizamos preços e informações regularmente</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">Sobre os Dados</h2>
            <p>
              O Vetor Blog utiliza dados proprietários gerados a partir dos reviews publicados. Esses dados são utilizados para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Alimentar análises de mercado por categoria</li>
              <li>Identificar tendências de preços e descontos</li>
              <li>Gerar conteúdo útil para motores de busca e assistentes de IA</li>
              <li>Melhorar a experiência de navegação do site</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">Contato</h2>
            <p>
              Sugestões, correções ou parcerias? Entre em contato:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>E-mail: <a href="mailto:contato@vetor.blog" className="text-blue hover:underline">contato@vetor.blog</a></li>
              <li>Site: <a href="https://www.vetor.blog" className="text-blue hover:underline">www.vetor.blog</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
