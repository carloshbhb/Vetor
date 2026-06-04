import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Vetor Blog',
  description: 'Política de privacidade do Vetor Blog. Saiba como coletamos, usamos e protegemos seus dados.',
  robots: { index: true, follow: true },
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-2">Política de Privacidade</h1>
        <p className="text-text-muted text-sm mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-lg max-w-none text-text-2 space-y-8">
          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">1. Introdução</h2>
            <p>
              Esta Política de Privacidade descreve como o <strong>Vetor Blog</strong> (&quot;nós&quot;, &quot;nosso&quot;) coleta, usa e protege suas informações pessoais quando você acessa nosso site (<a href="https://www.vetor.blog" className="text-blue hover:underline">www.vetor.blog</a>).
            </p>
            <p>
              Ao utilizar nosso site, você concorda com as práticas descritas nesta política.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">2. Dados Coletados</h2>
            <p>Podemos coletar os seguintes tipos de dados:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dados de navegação:</strong> endereço IP, tipo de navegador, dispositivo, páginas visitadas, tempo de permanência</li>
              <li><strong>Dados fornecidos voluntariamente:</strong> nome, e-mail ao comentar ou entrar em contato</li>
              <li><strong>Cookies:</strong> cookies de análise (Google Analytics), cookies de preferências e cookies de terceiros</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">3. Uso dos Dados</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Melhorar a experiência de navegação</li>
              <li>Analisar tráfego e tendências de uso</li>
              <li>Responder a comentários e contato</li>
              <li>Gerar conteúdo relevante para nossa audiência</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">4. Cookies</h2>
            <p>
              Utilizamos cookies para melhorar sua experiência. O Google Analytics coleta informações anônimas sobre seu uso do site. Você pode desativar os cookies nas configurações do seu navegador.
            </p>
            <p>
              Para mais informações, consulte a <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">Política de Cookies do Google</a>.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">5. Links de Afiliado</h2>
            <p>
              O Vetor Blog contém links de afiliado. Quando você clica nesses links e realiza uma compra, podemos receber uma comissão. Isso <strong>não</strong> aumenta o preço que você paga. Recomendações são baseadas em análises independentes.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">6. Serviços de Terceiros</h2>
            <p>Utilizamos os seguintes serviços de terceiros:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google Analytics:</strong> análise de tráfego</li>
              <li><strong>Google Search Console:</strong> monitoramento de indexação</li>
              <li><strong>Supabase:</strong> armazenamento de dados</li>
              <li><strong>Vercel:</strong> hospedagem do site</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">7. Seus Direitos</h2>
            <p>De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Solicitar acesso aos seus dados pessoais</li>
              <li>Solicitar correção de dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">8. Segurança</h2>
            <p>
              Adotamos medidas de segurança para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição. No entanto, nenhum método de transmissão pela internet é 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Recomendamos que você revise esta página regularmente.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">10. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta política, entre em contato pelo e-mail: <a href="mailto:contato@vetor.blog" className="text-blue hover:underline">contato@vetor.blog</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
