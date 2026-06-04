export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { CheckCircle, ExternalLink, Globe, Search, Settings, XCircle } from 'lucide-react';
import { getAllReviews } from '@/lib/db';
import IndexingActions from '@/components/admin/IndexingActions';

interface IndexingStatus {
  status: 'configured' | 'missing_credentials';
  hasCredentials: boolean;
  siteUrl: string;
}

async function getIndexingStatus(): Promise<IndexingStatus> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/google-indexing`, {
      cache: 'no-store',
    });
    return res.json();
  } catch {
    return { status: 'missing_credentials', hasCredentials: false, siteUrl: '' };
  }
}

export default async function IndexingPage() {
  const [status, reviews] = await Promise.all([
    getIndexingStatus(),
    getAllReviews(),
  ]);

  const publishedReviews = reviews.filter(r => r.status === 'published');

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Google Indexing</h1>
        <p className="text-text-muted text-sm">Gerencie a indexação das páginas no Google.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <Globe size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{publishedReviews.length}</p>
          <p className="text-text-muted text-xs font-medium">Páginas Publicadas</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
            status.hasCredentials ? 'bg-green-bg text-green' : 'bg-red-50 text-red-600'
          }`}>
            {status.hasCredentials ? <CheckCircle size={18} /> : <XCircle size={18} />}
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {status.hasCredentials ? 'OK' : 'ERRO'}
          </p>
          <p className="text-text-muted text-xs font-medium">Status da API</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-purple-bg text-purple">
            <Search size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {status.siteUrl ? new URL(status.siteUrl).hostname : '—'}
          </p>
          <p className="text-text-muted text-xs font-medium">Site Configurado</p>
        </div>
      </div>

      {!status.hasCredentials && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <Settings className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-syne font-bold text-sm text-yellow-800 mb-2">
                Google Indexing API não configurada
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Para usar esta funcionalidade, configure as variáveis de ambiente:
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Crie uma conta de serviço no Google Cloud Console</li>
                <li>Ative a Indexing API no projeto</li>
                <li>Adicione o email da conta como proprietário no Search Console</li>
                <li>Adicione <code className="bg-yellow-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> e <code className="bg-yellow-100 px-1 rounded">GOOGLE_PRIVATE_KEY</code> no Vercel</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Reviews Publicados
          </p>
          <IndexingActions reviews={publishedReviews} hasCredentials={status.hasCredentials} />
        </div>

        {publishedReviews.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Nenhum review publicado</p>
            <p className="text-xs mt-1">Publique reviews para indexá-los no Google.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg2">
                {['Produto', 'Slug', 'URL', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-syne font-bold uppercase tracking-widest text-text-muted border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {publishedReviews.map(review => (
                <tr key={review.id} className="border-b border-border last:border-0 hover:bg-bg2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm text-text">{review.product}</p>
                    <p className="text-xs text-text-muted mt-0.5">{review.category}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{review.slug}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/review/${review.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-blue hover:underline"
                    >
                      /review/{review.slug}
                      <ExternalLink size={12} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <IndexingActions
                      reviews={[review]}
                      hasCredentials={status.hasCredentials}
                      single
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FileText({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
