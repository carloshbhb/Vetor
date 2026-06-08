'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock, Zap, AlertTriangle } from 'lucide-react';

interface VitalAggregate {
  p50: number;
  p75: number;
  p95: number;
  rating: string;
}

interface AnalyticsData {
  totalVitals: number;
  aggregates: Record<string, VitalAggregate>;
  recentCount: number;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/web-vitals', { cache: 'no-store' });
        const json = await res.json();
        
        setData({
          totalVitals: json.total || 0,
          aggregates: json.aggregates || {},
          recentCount: json.metrics?.length || 0,
        });
      } catch {
        setData({ totalVitals: 0, aggregates: {}, recentCount: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-bg2 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-bg2 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const vitals = [
    { 
      name: 'LCP', 
      label: 'Largest Contentful Paint', 
      icon: Clock, 
      color: 'bg-blue-light text-blue',
      good: 2500,
    },
    { 
      name: 'FID', 
      label: 'First Input Delay', 
      icon: Zap, 
      color: 'bg-green-bg text-green',
      good: 100,
    },
    { 
      name: 'CLS', 
      label: 'Cumulative Layout Shift', 
      icon: Activity, 
      color: 'bg-yellow/20 text-yellow',
      good: 0.1,
    },
    { 
      name: 'TTFB', 
      label: 'Time to First Byte', 
      icon: AlertTriangle, 
      color: 'bg-purple-bg text-purple',
      good: 800,
    },
  ];

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
          Performance & Web Vitals
        </p>
        <p className="text-xs text-text-muted mt-1">
          {data.totalVitals} métricas coletadas
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {vitals.map(({ name, label, icon: Icon, color, good }) => {
            const agg = data.aggregates[name];
            const value = agg?.p50 || 0;
            const rating = agg?.rating || 'good';
            const isGood = rating === 'good';

            return (
              <div key={name} className="bg-bg2 rounded-lg p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                  <Icon size={16} />
                </div>
                <p className="font-bebas text-2xl text-text leading-none mb-1">
                  {value > 0 ? formatMs(value) : '—'}
                </p>
                <p className="text-text-muted text-[11px] font-medium">{label}</p>
                {agg && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isGood ? 'bg-green' : 'bg-yellow'}`} />
                    <span className="text-[10px] text-text-muted">
                      P75: {formatMs(agg.p75)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {data.recentCount === 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-text-muted">
              Nenhuma métrica de performance coletada ainda. As métricas serão automaticamente coletadas dos visitantes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
