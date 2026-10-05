"use client";

import { useCallback, useEffect, useState } from "react";

type VideoStatus = "pending" | "processing" | "completed" | "failed";

type VideoQueueItem = {
  id: string;
  product_url: string;
  product_title: string;
  product_category: string;
  product_price: string;
  product_image_url: string;
  status: VideoStatus;
  error_message: string | null;
  video_url: string | null;
  youtube_url: string | null;
  created_at: string;
  scheduled_at: string | null;
};

type VideoStats = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

const PAGE_SIZE = 50;
const STATUS_LABEL: Record<VideoStatus, string> = {
  pending: "Na fila",
  processing: "Processando",
  completed: "Concluído",
  failed: "Falhou",
};

const STATUS_STYLE: Record<VideoStatus, string> = {
  pending: "text-[var(--amber)] bg-[var(--amber)]/10",
  processing: "text-blue-400 bg-blue-400/10",
  completed: "text-[var(--green)] bg-[var(--green)]/10",
  failed: "text-[var(--red)] bg-[var(--red)]/10",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

async function readPayload(response: Response): Promise<Record<string, unknown>> {
  const payload = await response.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error || "Não foi possível concluir a operação."));
  return payload;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoQueueItem[]>([]);
  const [stats, setStats] = useState<VideoStats>({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingOn, setWorkingOn] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadVideos = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(targetPage * PAGE_SIZE) });
      const response = await fetch(`/api/video/queue?${params.toString()}`, { cache: "no-store" });
      const payload = await readPayload(response);
      setVideos(Array.isArray(payload.videos) ? payload.videos as VideoQueueItem[] : []);
      setStats(payload.stats ? payload.stats as VideoStats : { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
      setTotal(Number(payload.total || 0));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar a fila de vídeos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos(0);
  }, [loadVideos]);

  const createVideoJobs = async (body: Record<string, unknown>, successMessage: (payload: Record<string, unknown>) => string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/video/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readPayload(response);
      setNotice(successMessage(payload));
      setPage(0);
      await loadVideos(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível agendar o vídeo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUrl.trim()) return;
    await createVideoJobs({ productUrl: newUrl.trim() }, (payload) => {
      setNewUrl("");
      const video = payload.video as { product_title?: string } | undefined;
      return `Produto adicionado à fila: ${String(video?.product_title || "vídeo agendado")}.`;
    });
  };

  const handleBestSellers = async () => {
    await createVideoJobs({ bestSellers: 5 }, (payload) => `${Number(payload.created || 0)} vídeo(s) adicionado(s) dos mais vendidos do Mercado Livre.`);
  };

  const processVideo = async (id: string) => {
    setWorkingOn(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/video/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: id }),
      });
      const payload = await readPayload(response);
      if (!payload.success) throw new Error(String(payload.error || "O processamento não foi iniciado."));
      setNotice("Processamento iniciado para o produto selecionado.");
      await loadVideos(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível processar o vídeo.");
    } finally {
      setWorkingOn("");
    }
  };

  const retryVideo = async (id: string) => {
    setWorkingOn(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/video/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await readPayload(response);
      setNotice("Vídeo devolvido à fila.");
      await loadVideos(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível tentar novamente.");
    } finally {
      setWorkingOn("");
    }
  };

  const goToPage = async (nextPage: number) => {
    const safePage = Math.max(0, Math.min(nextPage, Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)));
    setPage(safePage);
    await loadVideos(safePage);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--amber)] font-bold">Produção</p>
          <h1 className="font-display text-3xl mt-1">Fila de vídeos</h1>
          <p className="text-sm text-[var(--muted)] mt-2">Acompanhe os vídeos persistidos no processamento real e gerencie cada etapa.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadVideos(page)}
          disabled={loading}
          className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-[var(--surface2)] disabled:opacity-50"
        >Atualizar fila</button>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 px-4 py-3 text-sm text-[var(--red)]">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 px-4 py-3 text-sm text-[var(--green)]">{notice}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {([
          ["Total", stats.total],
          ["Na fila", stats.pending],
          ["Processando", stats.processing],
          ["Concluídos", stats.completed],
          ["Falhas", stats.failed],
        ] as const).map(([label, value]) => (
          <div key={label} className="bg-[var(--surface)] border border-border rounded-xl p-4">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-2xl font-display text-[var(--amber)] mt-1">{value}</p>
          </div>
        ))}
      </div>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-6">
        <h2 className="font-heading font-bold">Adicionar à fila</h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mt-3">
          <input
            type="url"
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder="URL do produto (Amazon, Shopee ou Mercado Livre)"
            aria-label="URL do produto"
            required
            className="min-w-0 flex-1 bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm"
          />
          <button type="submit" disabled={saving} className="rounded-lg bg-[var(--amber)] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50">
            {saving ? "Agendando…" : "Agendar produto"}
          </button>
          <button type="button" onClick={() => void handleBestSellers()} disabled={saving} className="rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-50">
            {saving ? "Aguarde…" : "Adicionar 5 mais vendidos do ML"}
          </button>
        </form>
      </section>

      <section className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-heading font-bold">Vídeos cadastrados</h2>
            <p className="text-xs text-[var(--muted)] mt-1">{videos.length} exibidos · {total} registros</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void goToPage(page - 1)} disabled={page === 0 || loading} className="rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-40">Anterior</button>
            <span className="text-xs text-[var(--muted)]">Página {total ? page + 1 : 0} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button type="button" onClick={() => void goToPage(page + 1)} disabled={loading || (page + 1) * PAGE_SIZE >= total} className="rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-40">Próxima</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[var(--muted)]">
                <th className="px-5 py-3">Produto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado</th>
                <th className="px-4 py-3">Vídeo</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[var(--muted)]">Carregando fila…</td></tr>
              ) : videos.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-[var(--muted)]">Nenhum vídeo nesta página.</td></tr>
              ) : videos.map((video) => (
                <tr key={video.id} className="border-b border-border/70 hover:bg-[var(--surface2)]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {video.product_image_url ? <img src={video.product_image_url} alt="" className="h-12 w-12 rounded-lg object-cover bg-white" width={48} height={48} loading="lazy" /> : <div className="h-12 w-12 rounded-lg bg-[var(--surface2)]" />}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{video.product_title || "Produto sem título"}</p>
                        <p className="mt-1 truncate text-xs text-[var(--muted)]">{video.product_category || video.product_url}</p>
                        {video.error_message && <p className="mt-1 truncate text-xs text-[var(--red)]" title={video.error_message}>{video.error_message}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[video.status]}`}>{STATUS_LABEL[video.status]}</span></td>
                  <td className="px-4 py-4 text-xs text-[var(--muted)]">{formatDate(video.created_at)}</td>
                  <td className="px-4 py-4">
                    {(video.youtube_url || video.video_url) ? <a href={video.youtube_url || video.video_url || "#"} target="_blank" rel="noopener noreferrer" className="text-[var(--amber)] hover:underline">Abrir vídeo</a> : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-3">
                      {video.status === "pending" && <button type="button" onClick={() => void processVideo(video.id)} disabled={!!workingOn} className="text-xs text-[var(--amber)] hover:underline disabled:opacity-50">{workingOn === video.id ? "Iniciando…" : "Processar"}</button>}
                      {video.status === "failed" && <button type="button" onClick={() => void retryVideo(video.id)} disabled={!!workingOn} className="text-xs text-[var(--amber)] hover:underline disabled:opacity-50">{workingOn === video.id ? "Atualizando…" : "Tentar novamente"}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
