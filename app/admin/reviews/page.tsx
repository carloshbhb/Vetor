import Link from 'next/link';
import { getAllReviews, deleteReview } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { PlusCircle, Pencil, Eye, Trash2 } from 'lucide-react';

export default function ReviewsListPage() {
  const reviews = getAllReviews();

  async function remove(id: string) {
    'use server';
    deleteReview(id);
    revalidatePath('/admin/reviews');
  }

  return (
    <div className="p-8 flex-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Todos os Reviews</h1>
          <p className="text-text-muted text-sm">{reviews.length} reviews no total.</p>
        </div>
        <Link href="/admin/novo-review"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cta-gradient text-white font-syne font-bold text-sm uppercase tracking-wide shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 transition-all">
          <PlusCircle size={18} /> Novo Review
        </Link>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {reviews.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            <p className="font-syne font-bold text-sm mb-1">Nenhum review ainda</p>
            <p className="text-xs">Crie seu primeiro review.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg2 border-b border-border">
                {['Produto', 'Categoria', 'Posição Google (SERP)', 'Nota', 'Anúncios', 'Status', 'Atualizado', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-syne font-bold uppercase tracking-widest text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm text-text">{r.product}</p>
                    <p className="text-xs text-text-muted mt-0.5 max-w-[240px] truncate">{r.meta.title}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{r.category}</td>
                  <td className="px-4 py-3">
                    {r.status === 'published' ? (
                      r.googleRank && r.googleRank > 0 ? (
                        r.googleRank <= 3 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            🏆 Rank #{r.googleRank}
                          </span>
                        ) : r.googleRank <= 10 ? (
                          <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            📈 Rank #{r.googleRank}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            🔍 Rank #{r.googleRank}
                          </span>
                        )
                      ) : (
                        <span className="bg-slate-50 border border-slate-200 text-slate-400 text-xs font-medium px-2.5 py-1 rounded-full">
                          Não listado
                        </span>
                      )
                    ) : (
                      <span className="text-text-muted text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-light border border-blue-mid rounded-lg text-xs font-syne font-bold px-2.5 py-1 text-blue">{r.hero.overallScore}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${r.adsEnabled ? 'text-green' : 'text-text-muted'}`}>
                      {r.adsEnabled ? '✓ Ativo' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${r.status === 'published' ? 'bg-green-bg text-green border-green/20' : 'bg-yellow/15 text-yellow border-yellow/30'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'published' ? 'bg-green' : 'bg-yellow'}`} />
                      {r.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                    {new Date(r.updatedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/editar/${r.id}`}
                        className="p-2 rounded-lg border border-border text-text-muted hover:bg-bg2 hover:text-blue transition-colors">
                        <Pencil size={14} />
                      </Link>
                      {r.status === 'published' && (
                        <Link href={`/review/${r.slug}`} target="_blank"
                          className="p-2 rounded-lg bg-blue-light border border-blue-mid text-blue hover:bg-blue hover:text-white transition-colors">
                          <Eye size={14} />
                        </Link>
                      )}
                      <form action={remove.bind(null, r.id)}>
                        <button type="submit"
                          className="p-2 rounded-lg bg-red-bg border border-red/20 text-red hover:bg-red hover:text-white transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
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
