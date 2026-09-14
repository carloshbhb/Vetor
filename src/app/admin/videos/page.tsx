"use client";

import { useEffect, useState } from "react";

interface VideoJob {
  id: string;
  type: string;
  status: string;
  url?: string;
  error?: string;
  createdAt: string;
}

export default function AdminVideosPage() {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0 });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/admin/videos");
      const data = await res.json();
      setJobs(data.jobs || []);
      setStats({ total: data.totalJobs || 0, completed: data.completed || 0, failed: data.failed || 0 });
    } catch {}
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch("/api/admin/videos", { method: "POST", body: JSON.stringify({ type: "all" }) });
      await fetchJobs();
    } catch {}
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--muted)]">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Vídeos</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[var(--amber)] text-black text-sm font-heading font-extrabold px-6 py-3 rounded-xl hover:bg-white transition-colors disabled:opacity-50"
        >
          {generating ? "Gerando..." : "Gerar Vídeos"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--surface)] border border-border rounded-xl p-5">
          <p className="text-sm text-[var(--muted)]">Total de Jobs</p>
          <p className="text-3xl font-display text-[var(--amber)] mt-1">{stats.total}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-5">
          <p className="text-sm text-[var(--muted)]">Concluídos</p>
          <p className="text-3xl font-display text-[var(--green)] mt-1">{stats.completed}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-5">
          <p className="text-sm text-[var(--muted)]">Falhas</p>
          <p className="text-3xl font-display text-[var(--red)] mt-1">{stats.failed}</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Tipo</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Status</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">URL</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Criado</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted)]">
                    Nenhum vídeo gerado ainda. Clique em "Gerar Vídeos" para iniciar.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border hover:bg-[var(--surface2)] transition-colors">
                    <td className="px-4 py-3 text-[var(--text)] capitalize">{job.type}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        job.status === 'completed' ? 'text-[var(--green)]' :
                        job.status === 'failed' ? 'text-[var(--red)]' :
                        'text-[var(--amber)]'
                      }`}>
                        {job.status === 'completed' ? '✓ Concluído' :
                         job.status === 'failed' ? '✗ Falha' : '● Processando'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {job.url ? (
                        <a href={job.url} target="_blank" rel="noopener" className="text-[var(--amber)] hover:underline">
                          {job.url.split('/').pop()}
                        </a>
                      ) : job.error ? (
                        <span className="text-[var(--red)]">{job.error}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] text-xs">
                      {new Date(job.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
