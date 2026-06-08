export const dynamic = 'force-dynamic';

import { AlertTriangle, FileText, Globe, Server } from 'lucide-react';

interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  timestamp: string;
  type: 'client' | 'server';
  severity?: 'error' | 'warning' | 'info';
}

async function getErrors(): Promise<{ errors: ErrorLog[]; total: number }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/errors`, {
      cache: 'no-store',
    });
    return res.json();
  } catch {
    return { errors: [], total: 0 };
  }
}

export default async function ErrorsPage() {
  const { errors, total } = await getErrors();

  const realErrors = errors.filter(e => e.severity === 'error' || (!e.severity && e.type));
  const clientErrors = realErrors.filter(e => e.type === 'client');
  const serverErrors = realErrors.filter(e => e.type === 'server');
  const recentErrors = errors.slice(0, 50);

  const severityColors: Record<string, string> = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Error Logs</h1>
        <p className="text-text-muted text-sm">Monitore erros client e server em tempo real.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-red-50 text-red-600">
            <AlertTriangle size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{realErrors.length}</p>
          <p className="text-text-muted text-xs font-medium">Total de Erros</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <Globe size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{clientErrors.length}</p>
          <p className="text-text-muted text-xs font-medium">Erros Client</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-purple-bg text-purple">
            <Server size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{serverErrors.length}</p>
          <p className="text-text-muted text-xs font-medium">Erros Server</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Erros Recentes
          </p>
        </div>

        {recentErrors.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Nenhum erro registrado</p>
            <p className="text-xs mt-1">O sistema está funcionando sem erros.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentErrors.map((error, i) => (
              <div key={i} className="px-6 py-4 hover:bg-bg2 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityColors[error.severity || 'error']}`}>
                      {error.severity || 'error'}
                    </span>
                    <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                      error.type === 'client' ? 'bg-blue-light text-blue' : 'bg-purple-bg text-purple'
                    }`}>
                      {error.type}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {new Date(error.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm font-medium text-text mb-1">{error.message}</p>
                {error.url && (
                  <p className="text-xs text-text-muted mb-2">
                    <Globe size={12} className="inline mr-1" />
                    {error.url}
                  </p>
                )}
                {error.stack && (
                  <pre className="text-xs text-text-muted bg-bg2 rounded-lg p-3 overflow-x-auto max-h-32 overflow-y-auto">
                    {error.stack}
                  </pre>
                )}
                {error.componentStack && (
                  <pre className="text-xs text-text-muted bg-bg2 rounded-lg p-3 overflow-x-auto max-h-32 overflow-y-auto mt-2">
                    <strong>Component Stack:</strong>{'\n'}
                    {error.componentStack}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
