"use client";

import { useCallback, useEffect, useState } from "react";

type Board = { id: string; name: string; description?: string };
type QueueItem = {
  id: string;
  review_slug: string;
  content_type?: string | null;
  title: string;
  status: string;
  scheduled_at: string;
  published_at?: string | null;
  pin_id?: string | null;
  error?: string | null;
};
type Connection = {
  appConfigured: boolean;
  hasToken: boolean;
  hasRefreshToken: boolean;
  boardConfigured: boolean;
  needsReconnect: boolean;
  ready: boolean;
  message: string;
  boardId: string | null;
  boardName: string | null;
  expiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  updatedAt: string | null;
};
type Dashboard = {
  connection: Connection;
  queue: QueueItem[];
  counts: Record<string, number>;
  appConfigured: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Na fila",
    publishing: "Publicando",
    published: "Publicado",
    failed: "Falhou",
  };
  return labels[status] || status;
}

export default function PinterestAdminPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/pinterest", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível ler a integração.");
      setData(payload as Dashboard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar Pinterest.");
      setMessageError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(action: string, extra: Record<string, string> = {}) {
    setBusy(action);
    setMessage("");
    setMessageError(false);
    try {
      const response = await fetch("/api/admin/pinterest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Ação não concluída.");
      setMessage(payload.message || "Operação concluída.");
      if (action === "check" && Array.isArray(payload.boards)) {
        setBoards(payload.boards as Board[]);
        if (!payload.boards.length) setMessage("Conexão validada, mas a conta não retornou quadros.");
      }
      await load();
      if (action === "check" && Array.isArray(payload.boards)) setBoards(payload.boards as Board[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A ação falhou.");
      setMessageError(true);
    } finally {
      setBusy("");
    }
  }

  const connection = data?.connection;
  const queue = data?.queue || [];
  const counts = data?.counts || {};

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-[var(--surface)] p-6 shadow-sm lg:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Distribuição orgânica</span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Pinterest</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Distribua reviews e landing pages publicados como Pins com imagem, link para o Vetor.blog, agendamento e registro de falhas.</p>
          </div>
          <button onClick={() => void load()} disabled={loading || Boolean(busy)} className="rounded-xl border border-border bg-[var(--surface2)] px-4 py-2.5 text-sm font-bold hover:bg-[var(--surface)] disabled:opacity-50">Atualizar dados</button>
        </div>
      </header>

      {message && (
        <div role="status" className={"rounded-xl border px-4 py-3 text-sm " + (messageError ? "border-red-300 bg-red-50 text-red-800" : "border-border bg-[var(--surface)] text-[var(--text)]")}>
          {message}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Conexão", connection?.ready ? "Configurada" : connection?.needsReconnect ? "Reconectar" : "Pendente", connection?.message || "Carregando status"],
          ["Na fila", String(counts.pending || 0), "Pins aguardando horário"],
          ["Publicados", String(counts.published || 0), "Neste histórico recente"],
          ["Falhas", String(counts.failed || 0), "Podem ser reagendadas"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-display text-2xl font-black text-[var(--text)]">{loading ? "…" : value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-heading text-xl font-black">Conectar e configurar</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">A conta usa OAuth oficial. O token de acesso e o refresh token ficam no servidor; nenhum deles é enviado para o navegador.</p>
            <p className="mt-3 text-sm font-semibold">{connection?.message || "Verificando configuração…"}</p>
            {connection?.boardName && <p className="mt-1 text-sm text-[var(--muted)]">Quadro atual: <strong className="text-[var(--text)]">{connection.boardName}</strong></p>}
            {connection?.expiresAt && <p className="mt-1 text-xs text-[var(--muted)]">Próxima expiração do token de acesso: {formatDate(connection.expiresAt)}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/pinterest/auth" aria-disabled={!connection?.appConfigured} onClick={(event) => { if (!connection?.appConfigured) event.preventDefault(); }} className={"rounded-xl px-4 py-3 text-sm font-extrabold " + (connection?.appConfigured ? "bg-[var(--text)] text-[var(--bg)] hover:opacity-90" : "cursor-not-allowed bg-[var(--surface2)] text-[var(--muted)]")}>Conectar Pinterest</a>
            <button onClick={() => void runAction("check")} disabled={!connection?.appConfigured || Boolean(busy)} className="rounded-xl border border-border bg-[var(--surface2)] px-4 py-3 text-sm font-bold hover:bg-[var(--surface)] disabled:opacity-50">{busy === "check" ? "Testando…" : "Testar conexão"}</button>
          </div>
        </div>

        {!connection?.appConfigured && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Faltam as credenciais do aplicativo.</strong> Cadastre PINTEREST_CLIENT_ID e PINTEREST_CLIENT_SECRET no ambiente Production do Vercel e use o callback <code className="break-all">https://www.vetor.blog/api/pinterest/callback</code> nas configurações do app Pinterest.
          </div>
        )}

        {boards.length > 0 && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="pinterest-board" className="text-sm font-bold">Quadro de destino</label>
            <select id="pinterest-board" value={connection?.boardId || ""} onChange={(event) => { if (event.target.value) void runAction("setBoard", { boardId: event.target.value }); }} disabled={Boolean(busy)} className="min-h-11 min-w-0 rounded-xl border border-border bg-[var(--bg)] px-3 py-2 text-sm sm:min-w-72">
              <option value="">Selecione um quadro</option>
              {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
            </select>
            <span className="text-xs text-[var(--muted)]">A lista aparece após testar a conexão.</span>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-heading text-xl font-black">Fila de publicação</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">O worker verifica a fila diariamente. Cada Pin aponta para seu review ou LP, com imagem HTTPS e textos de SEO.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void runAction("queue")} disabled={!connection?.ready || Boolean(busy)} className="rounded-xl bg-[var(--text)] px-4 py-3 text-sm font-extrabold text-[var(--bg)] hover:opacity-90 disabled:opacity-40">{busy === "queue" ? "Enfileirando…" : "Adicionar publicados à fila"}</button>
            <button onClick={() => void runAction("publishDue")} disabled={!connection?.ready || Boolean(busy)} className="rounded-xl border border-border bg-[var(--surface2)] px-4 py-3 text-sm font-bold hover:bg-[var(--surface)] disabled:opacity-40">{busy === "publishDue" ? "Publicando…" : "Publicar Pins vencidos"}</button>
            {(counts.failed || 0) > 0 && <button onClick={() => void runAction("retryFailed")} disabled={!connection?.ready || Boolean(busy)} className="rounded-xl border border-red-300 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-40">{busy === "retryFailed" ? "Reagendando…" : "Reagendar falhas"}</button>}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[var(--surface2)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr><th className="px-4 py-3">Conteúdo</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Agendado / publicado</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Registro</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queue.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-4">
                    <a className="font-bold text-[var(--text)] hover:underline" href={"/reviews/" + encodeURIComponent(item.review_slug) + "/"} target="_blank" rel="noreferrer">{item.title || item.review_slug}</a>
                    <p className="mt-1 text-xs text-[var(--muted)]">{item.review_slug}</p>
                    {item.error && <p className="mt-2 max-w-sm text-xs leading-5 text-red-700">{item.error}</p>}
                  </td>
                  <td className="px-4 py-4 text-xs text-[var(--muted)]">{item.content_type === "lp" ? "Landing page" : "Review"}</td>
                  <td className="px-4 py-4 text-xs text-[var(--muted)]">{formatDate(item.published_at || item.scheduled_at)}</td>
                  <td className="px-4 py-4"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-bold " + (item.status === "published" ? "bg-emerald-100 text-emerald-800" : item.status === "failed" ? "bg-red-100 text-red-800" : "bg-[var(--surface2)] text-[var(--text)]")}>{statusLabel(item.status)}</span></td>
                  <td className="px-4 py-4 text-xs text-[var(--muted)]">{item.pin_id ? <a href={"https://www.pinterest.com/pin/" + item.pin_id + "/"} target="_blank" rel="noreferrer" className="underline">Abrir Pin</a> : "—"}</td>
                </tr>
              ))}
              {!loading && queue.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--muted)]">A fila está vazia. Conecte a conta e adicione reviews/LPs publicados.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">São exibidos os 30 registros mais recentes. A fila impede repetir o mesmo slug e mantém um único Pin por conteúdo.</p>
      </section>
    </div>
  );
}
