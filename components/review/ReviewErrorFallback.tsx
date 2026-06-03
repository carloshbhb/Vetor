'use client';

export default function ReviewErrorFallback({ error, reset }: { error?: Error; reset?: () => void }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="bg-white border border-border rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-bg rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        
        <h2 className="font-syne font-bold text-2xl text-text mb-3">
          Erro ao carregar review
        </h2>
        
        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          Não foi possível carregar este review. Verifique sua conexão com a internet e tente novamente.
        </p>

        {error && (
          <details className="mb-6 text-left">
            <summary className="text-xs text-text-muted cursor-pointer hover:text-text transition-colors">
              Detalhes do erro
            </summary>
            <pre className="mt-2 text-xs text-red bg-red-bg p-3 rounded-lg overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset?.()}
            className="px-6 py-3 bg-blue text-white rounded-xl font-syne font-bold text-sm uppercase tracking-wider hover:bg-blue-dark transition-colors"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-bg2 border border-border text-text rounded-xl font-syne font-bold text-sm uppercase tracking-wider hover:bg-border transition-colors"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
