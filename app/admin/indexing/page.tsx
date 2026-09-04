export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { CheckCircle, ExternalLink, Globe, Search, Settings, XCircle, FileText, Zap } from 'lucide-react';
import { getAllReviews } from '@/lib/db';
import IndexingActions from '@/components/admin/IndexingActions';

interface IndexingStatus {
  status: 'configured' | 'missing_credentials';
  hasGoogleCredentials: boolean;
  hasIndexNow: boolean;
  siteUrl: string;
}

function getIndexingStatus(): IndexingStatus {
  const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;
  const hasGoogleCredentials = hasEmail && hasKey;
  const hasIndexNow = !!process.env.INDEXNOW_KEY;

  return {
    status: hasGoogleCredentials ? 'configured' : 'missing_credentials',
    hasGoogleCredentials,
    hasIndexNow,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog',
  };
}

export default async function IndexingPage() {
  const [status, reviews] = await Promise.all([
    Promise.resolve(getIndexingStatus()),
    getAllReviews(),
  ]);

  const publishedReviews = reviews.filter(r => r.status === 'published');

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Indexação</h1>
        <p className="text-text-muted text-sm">Gerencie a indexação das páginas no Google e Bing.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <Globe size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{publishedReviews.length}</p>
          <p className="text-text-muted text-xs font-medium">Paginas Publicadas</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
            status.hasGoogleCredentials ? 'bg-green-bg text-green' : 'bg-red-50 text-red-600'
          }`}>
            {status.hasGoogleCredentials ? <CheckCircle size={18} /> : <XCircle size={18} />}
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {status.hasGoogleCredentials ? 'OK' : 'ERRO'}
          </p>
          <p className="text-text-muted text-xs font-medium">Google Indexing API</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
            status.hasIndexNow ? 'bg-green-bg text-green' : 'bg-red-50 text-red-600'
          }`}>
            {status.hasIndexNow ? <Zap size={18} /> : <XCircle size={18} />}
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {status.hasIndexNow ? 'OK' : 'ERRO'}
          </p>
          <p className="text-text-muted text-xs font-medium">IndexNow (Bing)</p>
        </div>
      </div>

      {!status.hasGoogleCredentials && (
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

      {!status.hasIndexNow && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <Zap className="text-orange-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-syne font-bold text-sm text-orange-800 mb-2">
                IndexNow (Bing) não configurado
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                Configure <code className="bg-orange-100 px-1 rounded">INDEXNOW_KEY</code> e <code className="bg-orange-100 px-1 rounded">INDEXNOW_KEY_LOCATION</code> para notificar o Bing instantaneamente sobre novos conteúdos.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Reviews Publicados
          </p>
          <IndexingActions reviews={publishedReviews} hasCredentials={status.hasGoogleCredentials} />
        </div>

        {publishedReviews.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Nenhum review publicado</p>
            <p className="text-xs mt-1">Publique reviews para indexá-los no Google e Bing.</p>
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
                      hasCredentials={status.hasGoogleCredentials}
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
