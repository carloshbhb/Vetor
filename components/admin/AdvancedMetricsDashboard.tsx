'use client';

import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

interface TrendData {
  timestamp: string;
  success: boolean;
  durationMs: number;
  agentName: string;
}

interface HourlyStats {
  hour: string;
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
}

interface TrendMetrics {
  hourly: HourlyStats[];
  daily: {
    date: string;
    total: number;
    successRate: number;
  }[];
  comparison: {
    period1: { successRate: number; avgDuration: number };
    period2: { successRate: number; avgDuration: number };
    change: number;
  };
}

export default function AdvancedMetricsDashboard() {
  const [metrics, setMetrics] = useState<TrendMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchTrendMetrics();
  }, [timeRange]);

  async function fetchTrendMetrics() {
    try {
      const res = await fetch(`/api/admin/metrics/trends?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch trend metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 size={18} className="text-purple" />
          <h2 className="font-bebas text-2xl tracking-wide text-text">Tendências</h2>
        </div>
        <div className="text-center py-8 text-text-muted">
          <Clock size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Carregando tendências...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <BarChart3 size={18} className="text-purple" />
          <h2 className="font-bebas text-2xl tracking-wide text-text">Tendências de Performance</h2>
        </div>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue text-white'
                  : 'bg-bg2 text-text-muted hover:bg-border'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {metrics && (
        <div className="p-6">
          {/* Comparison Card */}
          <div className="mb-6 p-4 bg-bg2 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text">Comparação com período anterior</span>
              <span className={`flex items-center gap-1 text-sm font-bold ${
                metrics.comparison.change >= 0 ? 'text-green' : 'text-red'
              }`}>
                {metrics.comparison.change >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                {Math.abs(metrics.comparison.change).toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Taxa de sucesso:</span>
                <span className="ml-2 font-medium text-text">
                  {metrics.comparison.period1.successRate.toFixed(1)}% → {metrics.comparison.period2.successRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-text-muted">Duração média:</span>
                <span className="ml-2 font-medium text-text">
                  {(metrics.comparison.period1.avgDuration / 1000).toFixed(1)}s → {(metrics.comparison.period2.avgDuration / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Hourly Chart */}
          <div className="mb-6">
            <h3 className="text-xs font-syne font-bold uppercase tracking-widest text-text-muted mb-4">
              Performance por Hora
            </h3>
            <div className="h-48 flex items-end gap-1">
              {metrics.hourly.map((hour, i) => {
                const height = hour.total > 0 ? (hour.success / hour.total) * 100 : 0;
                const color = height >= 80 ? 'bg-green' : height >= 50 ? 'bg-yellow' : 'bg-red';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className={`w-full ${color} rounded-t transition-all duration-300`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${hour.hour}: ${hour.success}/${hour.total} (${(height).toFixed(0)}%)`}
                    />
                    <span className="text-[9px] text-text-muted">{hour.hour.slice(0, 2)}h</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-text-muted">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>

          {/* Daily Trend */}
          <div>
            <h3 className="text-xs font-syne font-bold uppercase tracking-widest text-text-muted mb-4">
              Tendência Diária
            </h3>
            <div className="space-y-2">
              {metrics.daily.slice(-7).reverse().map((day, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <span className="w-20 text-text-muted">{formatDate(day.date)}</span>
                  <div className="flex-1 h-6 bg-bg2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        day.successRate >= 80 ? 'bg-green' : 
                        day.successRate >= 50 ? 'bg-yellow' : 'bg-red'
                      }`}
                      style={{ width: `${day.successRate}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-medium text-text">
                    {day.successRate.toFixed(0)}%
                  </span>
                  <span className="w-12 text-right text-text-muted text-xs">
                    {day.total} runs
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
