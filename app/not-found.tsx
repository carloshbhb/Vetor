import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg2 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <span className="font-bebas text-8xl text-blue/20">404</span>
        </div>
        <h1 className="font-syne font-bold text-2xl text-text mb-4">
          Página não encontrada
        </h1>
        <p className="text-text-muted mb-8">
          O conteúdo que você procura não existe ou foi movido para outro endereço.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue text-white font-medium rounded-xl hover:bg-blue/90 transition-colors"
          >
            Voltar para a página inicial
          </Link>
          <Link
            href="/sobre"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-text border border-border font-medium rounded-xl hover:bg-bg2 transition-colors"
          >
            Sobre o Vetor Blog
          </Link>
        </div>
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-text-muted">
            Se você acredita que esta página deveria existir,{' '}
            <a href="mailto:contato@vetor.blog" className="text-blue hover:underline">
              entre em contato
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Página não encontrada',
  description: 'A página que você procura não foi encontrada. Volte para a página inicial do Vetor Blog.',
  robots: { index: false, follow: true },
};
