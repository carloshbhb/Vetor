'use client';

import { useState } from 'react';
import { Settings, Loader2 } from 'lucide-react';

export default function ReconfigureButton() {
  const [loading, setLoading] = useState(false);

  const handleReconfigure = async () => {
    if (!confirm('Isso irá limpar a configuração atual do Pinterest. Deseja continuar?')) {
      return;
    }

    setLoading(true);
    try {
      await fetch('/api/pinterest/config', { method: 'DELETE' });
      window.location.reload();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReconfigure}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text border border-border rounded-lg hover:bg-bg2 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Settings size={12} />}
      Reconfigurar
    </button>
  );
}
