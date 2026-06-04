'use client';

import { useState } from 'react';
import { Pin, Loader2, Calendar } from 'lucide-react';

interface PinterestPinButtonProps {
  reviewId: string;
  reviewProduct: string;
}

export default function PinterestPinButton({ reviewId, reviewProduct }: PinterestPinButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleCreatePin = async (scheduleAt?: string) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/pinterest/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, scheduleAt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pin');
      }

      setResult(data.scheduled ? 'Agendado!' : 'Criado!');
      setShowSchedule(false);
      setTimeout(() => setResult(null), 3000);
    } catch (err) {
      setResult('Erro: ' + String(err));
      setTimeout(() => setResult(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = () => {
    if (scheduleDate) {
      handleCreatePin(new Date(scheduleDate).toISOString());
    }
  };

  if (showSchedule) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          value={scheduleDate}
          onChange={(e) => setScheduleDate(e.target.value)}
          min={new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16)}
          className="px-3 py-1.5 border border-border rounded-lg text-xs focus:ring-2 focus:ring-blue"
        />
        <button
          onClick={handleSchedule}
          disabled={loading || !scheduleDate}
          className="px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue/90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Agendar'}
        </button>
        <button
          onClick={() => setShowSchedule(false)}
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-bg2"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <span className={`text-xs font-medium ${result.includes('Erro') ? 'text-red-500' : 'text-green'}`}>
        {result}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleCreatePin()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Pin size={12} />}
        Criar Pin
      </button>
      <button
        onClick={() => setShowSchedule(true)}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-bg2 transition-colors"
        title="Agendar"
      >
        <Calendar size={12} />
      </button>
    </div>
  );
}
