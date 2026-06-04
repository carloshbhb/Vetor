'use client';

import { useState, useEffect } from 'react';
import { MousePointerClick, Eye, Clock, Users } from 'lucide-react';

interface AnalyticsData {
  affiliateClicks: number;
  pageViews: number;
  avgTimeOnPage: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; views: number; clicks: number }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated analytics data - in production, integrate with GA4 API or similar
    const mockData: AnalyticsData = {
      affiliateClicks: 0,
      pageViews: 0,
      avgTimeOnPage: 0,
      uniqueVisitors: 0,
      topPages: [],
    };
    setData(mockData);
    setLoading(false);
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

  const stats = [
    { label: 'Cliques Afiliados', value: data.affiliateClicks, icon: MousePointerClick, color: 'bg-blue-light text-blue' },
    { label: 'Visualizações', value: data.pageViews, icon: Eye, color: 'bg-green-bg text-green' },
    { label: 'Tempo Médio', value: `${data.avgTimeOnPage}s`, icon: Clock, color: 'bg-yellow/20 text-yellow' },
    { label: 'Visitantes', value: data.uniqueVisitors, icon: Users, color: 'bg-purple-bg text-purple' },
  ];

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
          Analytics & Engajamento
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-bg2 rounded-lg p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                <Icon size={16} />
              </div>
              <p className="font-bebas text-2xl text-text leading-none mb-1">{value}</p>
              <p className="text-text-muted text-[11px] font-medium">{label}</p>
            </div>
          ))}
        </div>

        {data.topPages.length > 0 && (
          <div>
            <h3 className="font-syne font-bold text-xs uppercase tracking-widest text-text mb-3">
              Páginas Mais Visitadas
            </h3>
            <div className="space-y-2">
              {data.topPages.slice(0, 5).map((page, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-bg2 rounded-lg">
                  <span className="text-sm text-text font-mono truncate max-w-[300px]">{page.path}</span>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{page.views} views</span>
                    <span>{page.clicks} cliques</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-text-muted">
            Para dados completos, integre com Google Analytics 4 ou similar.
          </p>
        </div>
      </div>
    </div>
  );
}
