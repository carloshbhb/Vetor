import type { Metadata } from 'next';

const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const SITE_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;

export const metadata: Metadata = {
  title: 'Termos de Uso — Vetor Blog',
  description: 'Termos de uso do Vetor Blog. Condições para utilização do site e seus conteúdos.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}/termos` },
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-2">Termos de Uso</h1>
        <p className="text-text-muted text-sm mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-lg max-w-none text-text-2 space-y-8">
          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o <strong>Vetor Blog</strong> (<a href="https://www.vetor.blog" className="text-blue hover:underline">www.vetor.blog</a>), você concorda com estes Termos de Uso. Se não concordar, não utilize o site.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">2. Uso do Site</h2>
            <p>O Vetor Blog é um blog de reviews e análises de produtos. Você pode:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ler e compartilhar conteúdo para uso pessoal e não comercial</li>
              <li>Comentar nos reviews (sujeito a moderação)</li>
              <li>Utilizar links de afiliado para compras</li>
            </ul>
            <p>É proibido:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Copiar, reproduzir ou redistribuir conteúdo sem autorização</li>
              <li>Utilizar o site para fins ilegais ou não autorizados</li>
              <li>Tentar acessar áreas restritas do sistema</li>
              <li>Enviar spam, vírus ou conteúdo malicioso</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">3. Conteúdo e Informações</h2>
            <p>
              As informações publicadas são baseadas em pesquisas e análises independentes. No entanto, não garantimos que os dados estão sempre completos ou livres de erros. Recomendamos sempre verificar informações diretamente com o fabricante ou vendedor.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">4. Links de Afiliado</h2>
            <p>
              O Vetor Blog participa de programas de afiliados. Links para produtos podem gerar comissões para o site. Isso <strong>não</strong> afeta o preço pago pelo consumidor. Nossas recomendações são baseadas em análises independentes e não são influenciadas por parcerias comerciais.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">5. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo do Vetor Blog (textos, imagens, logotipos, design) é protegido por direitos autorais. O uso não autorizado viola a Lei de Direitos Autorais (Lei nº 9.610/98).
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">6. Isenção de Responsabilidade</h2>
            <p>
              O Vetor Blog não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Decisões de compra baseadas nas informações do site</li>
              <li>Disponibilidade ou preços de produtos em sites de terceiros</li>
              <li>Problemas decorrentes do uso de links externos</li>
              <li>Perdas ou danos decorrentes do uso do site</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">7. Comentários</h2>
            <p>
              Comentários são moderados e podem ser removidos se contiverem linguagem ofensiva, spam, informações falsas ou conteúdo que viole estes termos.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">8. Alterações</h2>
            <p>
              Reservamo-nos o direito de alterar estes termos a qualquer momento. O uso continuado do site após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-3">9. Contato</h2>
            <p>
              Em caso de dúvidas, entre em contato: <a href="mailto:contato@vetor.blog" className="text-blue hover:underline">contato@vetor.blog</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
