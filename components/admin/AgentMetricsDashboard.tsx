'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface AgentMetric {
  agentName: string;
  operation: string;
  durationMs: number;
  success: boolean;
  provider?: string;
  errorMessage?: string;
  timestamp: string;
}

interface MetricsSummary {
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  autonomous: {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
  };
  serp: {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
  };
}

interface MetricsData {
  summary: MetricsSummary;
  byAgent: Record<string, { runs: number; successRate: number; avgDurationMs: number }>;
  recentMetrics: AgentMetric[];
}

export default function AgentMetricsDashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Activity size={18} className="text-blue" />
          <h2 className="font-bebas text-2xl tracking-wide text-text">Agent Metrics</h2>
        </div>
        <div className="text-center py-8 text-text-muted">
          <Clock size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-sm">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Activity size={18} className="text-blue" />
          <h2 className="font-bebas text-2xl tracking-wide text-text">Agent Metrics</h2>
        </div>
        <div className="text-center py-8 text-text-muted">
          <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma métrica disponível</p>
        </div>
      </div>
    );
  }

  const { summary, byAgent, recentMetrics } = data || {};
  if (!summary) return null;

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-blue" />
          <h2 className="font-bebas text-2xl tracking-wide text-text">Agent Metrics</h2>
        </div>
        <button
          onClick={fetchMetrics}
          className="text-xs text-blue hover:underline"
        >
          Atualizar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 p-6">
        <div className="bg-bg2 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-blue" />
            <span className="text-xs font-medium text-text-muted">Total Execuções</span>
          </div>
          <p className="font-bebas text-3xl text-text">{summary.totalRuns}</p>
        </div>
        <div className="bg-bg2 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-green" />
            <span className="text-xs font-medium text-text-muted">Taxa de Sucesso</span>
          </div>
          <p className="font-bebas text-3xl text-text">{summary.successRate}%</p>
        </div>
        <div className="bg-bg2 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-purple" />
            <span className="text-xs font-medium text-text-muted">Duração Média</span>
          </div>
          <p className="font-bebas text-3xl text-text">{(summary.avgDurationMs / 1000).toFixed(1)}s</p>
        </div>
        <div className="bg-bg2 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-orange" />
            <span className="text-xs font-medium text-text-muted">Agents Ativos</span>
          </div>
          <p className="font-bebas text-3xl text-text">{Object.keys(byAgent).length}</p>
        </div>
      </div>

      {/* Agent Breakdown */}
      <div className="px-6 pb-6">
        <h3 className="text-xs font-syne font-bold uppercase tracking-widest text-text-muted mb-4">
          Por Agent
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text">Autonomous Agent</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                summary.autonomous.successRate >= 80
                  ? 'bg-green-bg text-green'
                  : summary.autonomous.successRate >= 50
                  ? 'bg-yellow/20 text-yellow'
                  : 'bg-red-50 text-red'
              }`}>
                {Math.round(summary.autonomous.successRate * 100)}%
              </span>
            </div>
            <div className="space-y-2 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Execuções:</span>
                <span className="font-medium text-text">{summary.autonomous.totalRuns}</span>
              </div>
              <div className="flex justify-between">
                <span>Duração média:</span>
                <span className="font-medium text-text">{(summary.autonomous.avgDurationMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text">SERP Tracker</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                summary.serp.successRate >= 80
                  ? 'bg-green-bg text-green'
                  : summary.serp.successRate >= 50
                  ? 'bg-yellow/20 text-yellow'
                  : 'bg-red-50 text-red'
              }`}>
                {Math.round(summary.serp.successRate * 100)}%
              </span>
            </div>
            <div className="space-y-2 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Execuções:</span>
                <span className="font-medium text-text">{summary.serp.totalRuns}</span>
              </div>
              <div className="flex justify-between">
                <span>Duração média:</span>
                <span className="font-medium text-text">{(summary.serp.avgDurationMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-6 pb-6">
        <h3 className="text-xs font-syne font-bold uppercase tracking-widest text-text-muted mb-4">
          Atividade Recente
        </h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg2">
                <th className="px-4 py-2 text-left text-[10px] font-syne font-bold uppercase tracking-widest text-text-muted">
                  Agent
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-syne font-bold uppercase tracking-widest text-text-muted">
                  Operação
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-syne font-bold uppercase tracking-widest text-text-muted">
                  Duração
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-syne font-bold uppercase tracking-widest text-text-muted">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-syne font-bold uppercase tracking-widest text-text-muted">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {recentMetrics.slice(0, 10).map((metric, i) => (
                <tr key={i} className="border-t border-border last:border-0 hover:bg-bg2 transition-colors">
                  <td className="px-4 py-2">
                    <span className="text-xs font-medium text-text">{metric.agentName}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-text-muted">{metric.operation}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-text-muted">{(metric.durationMs / 1000).toFixed(1)}s</span>
                  </td>
                  <td className="px-4 py-2">
                    {metric.success ? (
                      <CheckCircle size={14} className="text-green" />
                    ) : (
                      <XCircle size={14} className="text-red" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs text-text-muted">
                      {new Date(metric.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
