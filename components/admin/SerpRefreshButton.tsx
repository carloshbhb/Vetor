'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SerpRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    setDone(false);
    try {
      const res = await fetch('/api/serp-tracker', { method: 'POST' });
      if (res.ok) {
        setDone(true);
        router.refresh();
        setTimeout(() => setDone(false), 3500);
      }
    } catch (err) {
      console.error('Error refreshing rankings:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-xs font-syne font-bold uppercase tracking-wider text-text-2 hover:bg-bg2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200"
    >
      {loading ? (
        <>
          <RefreshCw className="animate-spin text-blue" size={14} />
          <span>Rastreando SERP...</span>
        </>
      ) : done ? (
        <>
          <CheckCircle2 className="text-green" size={14} />
          <span>Rankings Atualizados!</span>
        </>
      ) : (
        <>
          <RefreshCw className="text-text-muted" size={14} />
          <span>Atualizar SERP</span>
        </>
      )}
    </button>
  );
}
