'use client';

import { useState } from 'react';
import { Settings, Loader2, AlertCircle } from 'lucide-react';

export default function ReconfigureButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReconfigure = async () => {
    if (!confirm('Isso irá limpar a configuração atual do Pinterest. Deseja continuar?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/pinterest/config', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao limpar configuração');
      }

      window.location.href = '/admin/pinterest?t=' + Date.now();
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleReconfigure}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text border border-border rounded-lg hover:bg-bg2 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Settings size={12} />}
        Reconfigurar
      </button>
      {error && (
        <span className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} />
          {error}
        </span>
      )}
    </div>
  );
}
