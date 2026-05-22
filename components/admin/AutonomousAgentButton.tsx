'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AutonomousAgentButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleTriggerAgent() {
    if (running) return;

    setRunning(true);
    setStatus(null);

    try {
      const res = await fetch('/api/cron/autonomous-agent', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({
          type: 'success',
          message: `Sucesso: "${data.product}" publicado em ${data.elapsedSeconds}s! ${
            data.githubPersisted ? 'Salvo no GitHub.' : 'Salvo localmente (sem GitHub).'
          }`,
        });
        router.refresh();
      } else {
        throw new Error(data.error || data.message || 'Erro desconhecido ao executar o agente.');
      }
    } catch (err: any) {
      console.error('Error running autonomous agent:', err);
      setStatus({
        type: 'error',
        message: err.message || 'Falha de conexão com o servidor.',
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="relative flex flex-col items-end">
      <button
        onClick={handleTriggerAgent}
        disabled={running}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-navy bg-white text-navy font-syne font-bold text-sm uppercase tracking-wide hover:bg-navy hover:text-white transition-all disabled:opacity-50 duration-200 shadow-sm"
        title="Executa o ciclo autônomo do agente: pesquisa tendências no Google Search, cria o review e publica no GitHub."
      >
        {running ? (
          <>
            <Loader2 className="animate-spin" size={17} />
            <span>Agente Pesquisando...</span>
          </>
        ) : (
          <>
            <Sparkles size={17} />
            <span>Executar Agente de IA</span>
          </>
        )}
      </button>

      {/* Floating Status Message */}
      {running && (
        <span className="absolute top-12 right-0 bg-navy text-white text-[11px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-md animate-pulse z-50">
          Pesquisando tendências e gerando artigo (30-50s)...
        </span>
      )}

      {status && (
        <div
          className={`absolute top-12 right-0 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold z-50 animate-slide-up whitespace-nowrap ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
          ) : (
            <AlertTriangle className="text-rose-600 shrink-0" size={16} />
          )}
          <span>{status.message}</span>
          <button
            onClick={() => setStatus(null)}
            className="ml-2 hover:opacity-60 text-[10px] uppercase font-bold"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
