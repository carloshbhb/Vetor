export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ExternalLink, ShoppingBag, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface MLConfig {
  hasClientId: boolean;
  hasClientSecret: boolean;
  redirectUri: string;
}

function getMLConfig(): MLConfig {
  return {
    hasClientId: !!process.env.ML_CLIENT_ID,
    hasClientSecret: !!process.env.ML_CLIENT_SECRET,
    redirectUri: 'https://www.vetor.blog/api/auth/ml/callback',
  };
}

export default async function MLPage() {
  const config = getMLConfig();
  const isConfigured = config.hasClientId && config.hasClientSecret;

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Mercado Livre</h1>
        <p className="text-text-muted text-sm">Gerencie a conexão com a API do Mercado Livre.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
            isConfigured ? 'bg-green-bg text-green' : 'bg-red-50 text-red-600'
          }`}>
            {isConfigured ? <CheckCircle size={18} /> : <XCircle size={18} />}
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {isConfigured ? 'OK' : 'ERRO'}
          </p>
          <p className="text-text-muted text-xs font-medium">Status da API</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <ShoppingBag size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">ML</p>
          <p className="text-text-muted text-xs font-medium">Plataforma</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-purple-bg text-purple">
            <RefreshCw size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">OAuth</p>
          <p className="text-text-muted text-xs font-medium">Autenticação</p>
        </div>
      </div>

      {!isConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <XCircle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-syne font-bold text-sm text-yellow-800 mb-2">
                API do Mercado Livre não configurada
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Para usar esta funcionalidade, configure as variáveis de ambiente:
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Crie um aplicativo no <a href="https://developers.mercadolivre.com.br/" target="_blank" className="underline">Portal de Desenvolvedores</a></li>
                <li>Obtenha o <code className="bg-yellow-100 px-1 rounded">ML_CLIENT_ID</code></li>
                <li>Obtenha o <code className="bg-yellow-100 px-1 rounded">ML_CLIENT_SECRET</code></li>
                <li>Configure o redirect URI como: <code className="bg-yellow-100 px-1 rounded">{config.redirectUri}</code></li>
                <li>Adicione as variáveis de ambiente no Vercel</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Configuração
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-syne font-bold text-sm text-text mb-4">Variáveis de Ambiente</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-bg2 rounded-lg">
                  <span className="text-sm text-text">ML_CLIENT_ID</span>
                  <span className={`text-xs font-medium ${config.hasClientId ? 'text-green' : 'text-red-500'}`}>
                    {config.hasClientId ? 'Configurado' : 'Não configurado'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-bg2 rounded-lg">
                  <span className="text-sm text-text">ML_CLIENT_SECRET</span>
                  <span className={`text-xs font-medium ${config.hasClientSecret ? 'text-green' : 'text-red-500'}`}>
                    {config.hasClientSecret ? 'Configurado' : 'Não configurado'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-syne font-bold text-sm text-text mb-4">Endpoints</h3>
              <div className="space-y-3">
                <div className="p-3 bg-bg2 rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Autorização</p>
                  <code className="text-sm text-text font-mono">/api/auth/ml/authorize</code>
                </div>
                <div className="p-3 bg-bg2 rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Callback</p>
                  <code className="text-sm text-text font-mono">/api/auth/ml/callback</code>
                </div>
                <div className="p-3 bg-bg2 rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Redirect URI</p>
                  <code className="text-xs text-text font-mono break-all">{config.redirectUri}</code>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-syne font-bold text-sm text-text mb-4">Ações</h3>
            <div className="flex items-center gap-3">
              <a
                href="/api/auth/ml/authorize"
                target="_blank"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isConfigured
                    ? 'bg-blue text-white hover:bg-blue/90'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ExternalLink size={16} />
                Conectar com Mercado Livre
              </a>
              <Link
                href="/admin/novo-review"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-2 hover:bg-bg2 transition-colors"
              >
                <ShoppingBag size={16} />
                Buscar Produto no ML
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
