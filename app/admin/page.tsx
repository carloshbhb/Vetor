export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { PlusCircle, FileText, Star, Eye } from 'lucide-react';
import { getAllReviews } from '@/lib/db';
import SerpRefreshButton from '@/components/admin/SerpRefreshButton';
import AutonomousAgentButton from '@/components/admin/AutonomousAgentButton';
import RealtimeIndicator from '@/components/admin/RealtimeIndicator';
import AICitationsDashboard from '@/components/admin/AICitationsDashboard';
import SerpHistoryChart from '@/components/admin/SerpHistoryChart';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import AgentMetricsDashboard from '@/components/admin/AgentMetricsDashboard';

export default async function AdminDashboard() {
  const reviews = await getAllReviews();
  const published = reviews.filter(r => r.status === 'published');
  const drafts    = reviews.filter(r => r.status === 'draft');
  const avgScore  = reviews.length
    ? (reviews.reduce((s, r) => s + r.hero.overallScore, 0) / reviews.length).toFixed(1)
    : '—';

  const stats = [
    { label: 'Total de Reviews', value: reviews.length, icon: FileText,  color: 'bg-blue-light text-blue' },
    { label: 'Publicados',       value: published.length, icon: Eye,      color: 'bg-green-bg text-green' },
    { label: 'Rascunhos',        value: drafts.length,   icon: FileText,  color: 'bg-yellow/20 text-yellow' },
    { label: 'Nota Média',       value: avgScore,         icon: Star,      color: 'bg-purple-bg text-purple' },
  ];

  return (
    <div className="p-8 flex-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Dashboard</h1>
          <p className="text-text-muted text-sm">Gerencie os reviews do Vetor Blog.</p>
        </div>
        <div className="flex items-center gap-3">
          <AutonomousAgentButton />
          <Link
            href="/admin/novo-review"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cta-gradient text-white font-syne font-bold text-sm uppercase tracking-wide shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 transition-all"
          >
            <PlusCircle size={18} />
            Novo Review
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-border rounded-lg p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <p className="font-bebas text-4xl text-text leading-none mb-1">{value}</p>
            <p className="text-text-muted text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Reviews table */}
      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Reviews Recentes
          </p>
          <div className="flex items-center gap-4">
            <RealtimeIndicator />
            <SerpRefreshButton />
            <Link href="/admin/reviews" className="text-blue text-xs font-medium hover:underline">
              Ver todos →
            </Link>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Nenhum review ainda</p>
            <p className="text-xs mt-1">Crie seu primeiro review para começar.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg2">
                {['Produto','Categoria','Posição Google (SERP)','Nota','Status','Data','Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-syne font-bold uppercase tracking-widest text-text-muted border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reviews.slice(0, 8).map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm text-text">{r.product}</p>
                    <p className="text-xs text-text-muted mt-0.5 max-w-[220px] truncate">{r.meta.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-bg2 border border-border rounded-full text-xs font-medium px-2.5 py-0.5 text-text-muted">
                      {r.category}
                    </span>
                  </td>
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
                    <span className="bg-blue-light border border-blue-mid rounded-lg text-xs font-syne font-bold px-2.5 py-1 text-blue">
                      {r.hero.overallScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full
                      ${r.status === 'published'
                        ? 'bg-green-bg text-green border border-green/20'
                        : 'bg-yellow/15 text-yellow border border-yellow/30'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'published' ? 'bg-green' : 'bg-yellow'}`} />
                      {r.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(r.updatedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/editar/${r.id}`}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-2 hover:bg-bg2 transition-colors"
                      >
                        Editar
                      </Link>
                      {r.status === 'published' && (
                        <Link
                          href={`/review/${r.slug}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-lg bg-blue-light border border-blue-mid text-xs font-medium text-blue hover:bg-blue hover:text-white transition-colors"
                        >
                          Ver
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* AI Citations Monitor (GEO) */}
      <div className="mt-8">
        <AICitationsDashboard />
      </div>

      {/* SERP History */}
      <div className="mt-8">
        <SerpHistoryChart reviews={reviews} />
      </div>

      {/* Analytics Dashboard */}
      <div className="mt-8">
        <AnalyticsDashboard />
      </div>

      {/* Agent Metrics */}
      <div className="mt-8">
        <AgentMetricsDashboard />
      </div>
    </div>
  );
}
