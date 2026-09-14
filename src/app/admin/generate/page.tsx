"use client";

import { useState } from "react";

interface GenerationResult {
  success: boolean;
  message: string;
  count?: number;
}

export default function AdminGeneratePage() {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [progress, setProgress] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    setProgress("Iniciando geração de conteúdo...");

    try {
      setProgress("Enviando requisição para o servidor...");
      const res = await fetch("/api/admin/generate", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setProgress("Conteúdo gerado com sucesso!");
        setResult({
          success: true,
          message: data.message || "Conteúdo gerado com sucesso.",
          count: data.count,
        });
      } else {
        setProgress("Erro na geração.");
        setResult({
          success: false,
          message: data.error || "Erro ao gerar conteúdo.",
        });
      }
    } catch {
      setProgress("Erro de conexão.");
      setResult({
        success: false,
        message: "Não foi possível conectar ao servidor de geração.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Gerar Conteúdo</h1>

      <div className="bg-[var(--surface)] border border-border rounded-xl p-6 max-w-xl">
        <h2 className="font-heading text-sm font-bold tracking-wider uppercase text-[var(--muted)] mb-2">Geração Automática</h2>
        <p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">
          Gere novos reviews e artigos virais usando IA. O processo pode levar
          alguns minutos.
        </p>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[var(--amber)] text-black text-sm font-heading font-extrabold px-6 py-3 rounded-xl hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Gerando...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Gerar Conteúdo
            </>
          )}
        </button>

        {progress && (
          <div className="mt-4 flex items-center gap-2">
            {generating && (
              <div className="w-2 h-2 rounded-full bg-[var(--amber)] animate-pulse" />
            )}
            <p className="text-sm text-[var(--muted)]">{progress}</p>
          </div>
        )}

        {result && (
          <div
            className={`mt-4 p-4 rounded-xl text-sm ${
              result.success
                ? "bg-[var(--green)]/10 border border-[var(--green)]/20 text-[var(--green)]"
                : "bg-[var(--red)]/10 border border-[var(--red)]/20 text-[var(--red)]"
            }`}
          >
            <p>{result.message}</p>
            {result.count !== undefined && (
              <p className="mt-1 text-xs opacity-75">
                {result.count} itens gerados.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}