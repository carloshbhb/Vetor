export const dynamic = 'force-dynamic';

import { Pin, Settings, Loader2, Plus, Calendar, Image } from 'lucide-react';
import { getAllReviews } from '@/lib/db';
import { getPinterestConfig, getScheduledPins } from '@/lib/pinterest';
import PinterestSetupForm from '@/components/admin/PinterestSetupForm';
import PinterestPinButton from '@/components/admin/PinterestPinButton';
import PinterestScheduledPins from '@/components/admin/PinterestScheduledPins';

export default async function PinterestPage() {
  const [config, reviews, scheduledPins] = await Promise.all([
    getPinterestConfig(),
    getAllReviews(),
    getScheduledPins(),
  ]);

  const publishedReviews = reviews.filter(r => r.status === 'published');
  const pinsCreated = scheduledPins.filter(p => p.status === 'published').length;
  const pinsPending = scheduledPins.filter(p => p.status === 'pending').length;

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Pinterest</h1>
        <p className="text-text-muted text-sm">Automatize a criação de pins para trazer tráfego e backlinks.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
            config ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            <Pin size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {config ? 'OK' : 'OFF'}
          </p>
          <p className="text-text-muted text-xs font-medium">Status</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <Image size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{pinsCreated}</p>
          <p className="text-text-muted text-xs font-medium">Pins Criados</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-yellow/20 text-yellow">
            <Calendar size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{pinsPending}</p>
          <p className="text-text-muted text-xs font-medium">Agendados</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-green-bg text-green">
            <Settings size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{publishedReviews.length}</p>
          <p className="text-text-muted text-xs font-medium">Reviews Disponíveis</p>
        </div>
      </div>

      {config && (
        <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
              Board Conectado: {config.boardName}
            </p>
          </div>
          <div className="p-6">
            <p className="text-sm text-text-muted mb-4">
              Seu Pinterest está conectado. Clique em &quot;Criar Pin&quot; ao lado de cada review para publicar automaticamente.
            </p>
          </div>
        </div>
      )}

      <PinterestSetupForm />

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden mb-8 mt-8">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Reviews Publicados
          </p>
        </div>
        {publishedReviews.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Image size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Nenhum review publicado</p>
            <p className="text-xs mt-1">Publique reviews para criar pins no Pinterest.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg2">
                {['Produto', 'Categoria', 'Nota', 'Ações'].map(h => (
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
                    <p className="text-xs text-text-muted mt-0.5">/review/{review.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-bg2 border border-border rounded-full text-xs font-medium px-2.5 py-0.5 text-text-muted">
                      {review.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-light border border-blue-mid rounded-lg text-xs font-syne font-bold px-2.5 py-1 text-blue">
                      {review.hero.overallScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PinterestPinButton reviewId={review.id} reviewProduct={review.product} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PinterestScheduledPins pins={scheduledPins} />
    </div>
  );
}
