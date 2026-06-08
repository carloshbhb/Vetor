export const dynamic = 'force-dynamic';

import { Activity, Clock, Eye, Zap } from 'lucide-react';
import { getWebVitals } from '@/lib/db-vitals';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  timestamp: string;
}

interface Aggregates {
  [name: string]: {
    p50: number;
    p75: number;
    p95: number;
    rating: string;
  };
}

function formatValue(name: string, value: number): string {
  if (name === 'CLS') return value.toFixed(3);
  if (name === 'FID' || name === 'INP') return `${Math.round(value)}ms`;
  if (name === 'LCP') return `${(value / 1000).toFixed(2)}s`;
  if (name === 'FCP') return `${(value / 1000).toFixed(2)}s`;
  if (name === 'TTFB') return `${Math.round(value)}ms`;
  return value.toFixed(2);
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case 'good': return 'bg-green-bg text-green border-green/20';
    case 'needs-improvement': return 'bg-yellow/15 text-yellow border-yellow/30';
    case 'poor': return 'bg-red-50 text-red-600 border-red-200';
    default: return 'bg-slate-50 text-slate-500 border-slate-200';
  }
}

function getRatingLabel(rating: string): string {
  switch (rating) {
    case 'good': return 'Bom';
    case 'needs-improvement': return 'Precisa melhorar';
    case 'poor': return 'Ruim';
    default: return '—';
  }
}

const METRIC_LABELS: Record<string, string> = {
  LCP: 'Largest Contentful Paint',
  FID: 'First Input Delay',
  CLS: 'Cumulative Layout Shift',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
  INP: 'Interaction to Next Paint',
};

export default async function WebVitalsPage() {
  const { metrics, aggregates, total } = await getWebVitals();

  const uniqueUrls = new Set(metrics.map(m => m.url)).size;

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Web Vitals</h1>
        <p className="text-text-muted text-sm">Metricas de performance coletadas dos visitantes.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <Activity size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{total}</p>
          <p className="text-text-muted text-xs font-medium">Total de Metricas</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-green-bg text-green">
            <Eye size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{uniqueUrls}</p>
          <p className="text-text-muted text-xs font-medium">Paginas Monitoradas</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-purple-bg text-purple">
            <Zap size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {Object.keys(aggregates).length}
          </p>
          <p className="text-text-muted text-xs font-medium">Metricas Rastreadas</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-yellow/20 text-yellow">
            <Clock size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {metrics.length > 0
              ? new Date(metrics[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
          <p className="text-text-muted text-xs font-medium">Ultima Coleta</p>
        </div>
      </div>

      {Object.keys(aggregates).length > 0 && (
        <div className="mb-8">
          <h2 className="font-syne font-bold text-xs uppercase tracking-widest text-text mb-4">
            Agregados por Metrica
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(aggregates).map(([name, data]) => (
              <div key={name} className="bg-white border border-border rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-syne font-bold text-sm text-text">{name}</p>
                    <p className="text-xs text-text-muted">{METRIC_LABELS[name] || name}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getRatingColor(data.rating)}`}>
                    {getRatingLabel(data.rating)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-bg2 rounded-lg p-2">
                    <p className="text-xs text-text-muted">P50</p>
                    <p className="font-mono font-bold text-sm text-text">{formatValue(name, data.p50)}</p>
                  </div>
                  <div className="bg-bg2 rounded-lg p-2">
                    <p className="text-xs text-text-muted">P75</p>
                    <p className="font-mono font-bold text-sm text-text">{formatValue(name, data.p75)}</p>
                  </div>
                  <div className="bg-bg2 rounded-lg p-2">
                    <p className="text-xs text-text-muted">P95</p>
                    <p className="font-mono font-bold text-sm text-text">{formatValue(name, data.p95)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Metricas Recentes
          </p>
        </div>

        {metrics.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Nenhuma metrica coletada</p>
            <p className="text-xs mt-1">As metricas sao coletadas automaticamente dos visitantes.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg2">
                {['Metrica', 'Valor', 'Rating', 'Pagina', 'Data'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-syne font-bold uppercase tracking-widest text-text-muted border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-bg2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm text-text">{metric.name}</p>
                    <p className="text-xs text-text-muted">{METRIC_LABELS[metric.name] || metric.name}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text">
                    {formatValue(metric.name, metric.value)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getRatingColor(metric.rating)}`}>
                      {getRatingLabel(metric.rating)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted max-w-[200px] truncate">
                    {metric.url}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(metric.timestamp).toLocaleString('pt-BR')}
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
