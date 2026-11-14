"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ApiPayload = Record<string, any>;

async function readResponse(response: Response): Promise<ApiPayload> {
  const payload = (await response.json().catch(() => ({}))) as ApiPayload;
  if (!response.ok || payload.success === false) {
    throw new Error(String(payload.error || "Não foi possível concluir a operação."));
  }
  return payload;
}

function pretty(value: unknown): string {
  if (value === null || value === undefined) return "Sem dados disponíveis.";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function findJobId(value: unknown, depth = 0): string {
  if (depth > 7 || value === null || value === undefined) return "";
  if (typeof value === "string") {
    try {
      return findJobId(JSON.parse(value), depth + 1);
    } catch {
      return "";
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobId(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["job_id", "jobId", "video_id", "videoId"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  for (const key of ["result", "structuredContent", "data", "content", "output"]) {
    const found = findJobId(record[key], depth + 1);
    if (found) return found;
  }
  return "";
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm">
      <h2 className="font-heading text-lg font-black">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const fieldClass =
  "w-full rounded-lg border border-border bg-[var(--surface2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--amber)]";
const actionClass =
  "rounded-lg bg-[var(--amber)] px-4 py-2.5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50";

export default function DigitalMakerAIPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [account, setAccount] = useState<unknown>(null);
  const [options, setOptions] = useState<unknown>(null);
  const [creations, setCreations] = useState<unknown>(null);
  const [tools, setTools] = useState<Array<{ name: string; description: string }>>([]);
  const [latestResult, setLatestResult] = useState<unknown>(null);

  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [orientation, setOrientation] = useState<"vertical" | "landscape">("landscape");
  const [format, setFormat] = useState("multi");
  const [durationSeconds, setDurationSeconds] = useState("45");
  const [durationMinutes, setDurationMinutes] = useState("5");
  const [whiteboardHand, setWhiteboardHand] = useState("none");
  const [jobId, setJobId] = useState("");

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageType, setImageType] = useState("youtube_thumbnail");
  const [niche, setNiche] = useState("");
  const [keyword, setKeyword] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/digital-maker-ai", { cache: "no-store" });
      const payload = await readResponse(response);
      setAccount(payload.account ?? null);
      setOptions(payload.videoOptions ?? null);
      setCreations(payload.creations ?? null);
      setTools(Array.isArray(payload.tools) ? payload.tools : []);
      const failures = Object.values(payload.errors || {}).filter(Boolean);
      if (failures.length) {
        setError("Algumas informações não puderam ser carregadas: " + failures.join(" · "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao conectar com Digital Maker AI.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (
    action: string,
    body: Record<string, unknown>,
    successMessage: string
  ) => {
    setBusy(action);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/digital-maker-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await readResponse(response);
      setLatestResult(payload.result ?? payload);
      const id = findJobId(payload.result);
      if (id && action === "createVideo") setJobId(id);
      setNotice(successMessage + (id && action === "createVideo" ? " ID do job preenchido para acompanhamento." : ""));
      if (action === "createVideo" || action === "generateImage") {
        void refresh();
      }
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "A operação no Digital Maker AI falhou.");
      return null;
    } finally {
      setBusy("");
    }
  };

  const submitVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "createVideo",
      {
        topic,
        script,
        orientation,
        format,
        durationSeconds: Number(durationSeconds),
        durationMinutes: Number(durationMinutes),
        whiteboardHand,
      },
      "Solicitação enviada ao Digital Maker AI. A geração continua em segundo plano."
    );
  };

  const submitImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "generateImage",
      { prompt: imagePrompt, imageType },
      "Geração de imagem solicitada."
    );
  };

  const submitResearch = async (kind: "findChannels" | "searchTrends") => {
    if (kind === "findChannels") {
      await runAction(kind, { niche }, "Pesquisa de canais concluída.");
    } else {
      await runAction(kind, { keyword }, "Consulta de tendências concluída.");
    }
  };

  const checkVideo = async () => {
    await runAction("checkVideo", { jobId }, "Status do vídeo atualizado.");
  };

  return (
    <div>
      <header className="mb-6 rounded-2xl border border-border bg-[var(--surface)] p-6 shadow-sm lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">
              Integração MCP
            </span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">
              Digital Maker AI
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Gere vídeos, imagens e pesquisas diretamente pelo servidor Digital Maker AI.
              Esta área funciona em paralelo à fila Remotion do Vetor e não publica nada automaticamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/videos" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-[var(--surface2)]">
              Fila Remotion
            </a>
            <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-[var(--surface2)] disabled:opacity-50">
              {loading ? "Atualizando…" : "Atualizar conexão"}
            </button>
          </div>
        </div>
      </header>

      <div className="mb-5 rounded-xl border border-[var(--amber)]/30 bg-[var(--amber-bg)] px-4 py-3 text-sm leading-6">
        <strong>Limite de idioma:</strong> a documentação atual do Digital Maker AI lista inglês, francês, espanhol, italiano e alemão, mas não português. Shorts verticais são somente em inglês e exigem o formato Multi Scene. Para os vídeos principais em português do Vetor, continue usando Remotion + Edge TTS.
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 px-4 py-3 text-sm text-[var(--red)]">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 px-4 py-3 text-sm text-[var(--green)]">{notice}</div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Conexão</p>
          <p className="mt-2 text-lg font-black">{loading ? "Verificando…" : account ? "Servidor respondeu" : "Sem resposta"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Chave privada no ambiente Production</p>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Ferramentas MCP</p>
          <p className="mt-2 text-lg font-black">{tools.length || "—"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Ferramentas anunciadas pelo servidor</p>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Pipeline Vetor</p>
          <p className="mt-2 text-lg font-black">Remotion principal</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Fila, QA e publicação existentes preservados</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Criar vídeo"
          description="A solicitação cria um job assíncrono no Digital Maker AI. Consulte o ID retornado para acompanhar o processamento."
        >
          <form onSubmit={submitVideo} className="space-y-3">
            <label className="block text-sm font-semibold">
              Tema do vídeo
              <input value={topic} onChange={(event) => setTopic(event.target.value)} className={fieldClass + " mt-1"} placeholder="Ex.: uma análise visual de projetores portáteis" />
            </label>
            <label className="block text-sm font-semibold">
              Roteiro pronto (opcional, mínimo 40 palavras)
              <textarea value={script} onChange={(event) => setScript(event.target.value)} className={fieldClass + " mt-1 min-h-28"} placeholder="Cole um roteiro em um dos idiomas suportados. O tamanho do roteiro determina a duração." />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Orientação
                <select
                  value={orientation}
                  onChange={(event) => {
                    const value = event.target.value as "vertical" | "landscape";
                    setOrientation(value);
                    if (value === "vertical") setFormat("multi");
                  }}
                  className={fieldClass + " mt-1"}
                >
                  <option value="landscape">Horizontal · 16:9</option>
                  <option value="vertical">Vertical · Short 9:16 (inglês)</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Estilo visual
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  className={fieldClass + " mt-1"}
                  disabled={orientation === "vertical"}
                >
                  <option value="multi">Multi Scene · imagem por cena</option>
                  {orientation === "landscape" && <option value="whiteboard">Whiteboard · desenho em quadro</option>}
                </select>
              </label>
            </div>
            {orientation === "vertical" ? (
              <label className="block text-sm font-semibold">
                Duração do Short
                <select value={durationSeconds} onChange={(event) => setDurationSeconds(event.target.value)} className={fieldClass + " mt-1"}>
                  <option value="15">15 segundos</option>
                  <option value="30">30 segundos</option>
                  <option value="45">45 segundos</option>
                  <option value="60">60 segundos</option>
                </select>
              </label>
            ) : (
              <label className="block text-sm font-semibold">
                Duração do vídeo longo
                <select value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className={fieldClass + " mt-1"} disabled={!!script.trim()}>
                  <option value="1">1 minuto</option>
                  <option value="3">3 minutos</option>
                  <option value="5">5 minutos</option>
                  <option value="10">10 minutos</option>
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </label>
            )}
            {format === "whiteboard" && orientation === "landscape" && (
              <label className="block text-sm font-semibold">
                Mão que desenha no quadro
                <select value={whiteboardHand} onChange={(event) => setWhiteboardHand(event.target.value)} className={fieldClass + " mt-1"}>
                  <option value="none">Sem mão · os traços aparecem sozinhos</option>
                  <option value="light">Mão clara</option>
                  <option value="brown">Mão parda</option>
                  <option value="dark">Mão escura</option>
                </select>
              </label>
            )}
            <p className="text-xs leading-5 text-[var(--muted)]">
              A geração consome minutos do plano. Um Short vertical usa 1 minuto da franquia, independentemente de durar 15 a 60 segundos. Vídeos horizontais consomem minutos conforme a duração. Roteiro próprio precisa ter pelo menos 40 palavras e define a duração.
            </p>
            <button type="submit" disabled={!!busy || (!topic.trim() && !script.trim())} className={actionClass}>
              {busy === "createVideo" ? "Enviando solicitação…" : "Criar vídeo no Digital Maker AI"}
            </button>
          </form>
        </Panel>

        <Panel
          title="Criar imagem ou thumbnail"
          description="Gere arte complementar para vídeos, canais e produtos."
        >
          <form onSubmit={submitImage} className="space-y-3">
            <label className="block text-sm font-semibold">
              Descrição da imagem
              <textarea value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} className={fieldClass + " mt-1 min-h-32"} placeholder="Descreva o produto, composição, cenário, iluminação e texto desejado." required />
            </label>
            <label className="block text-sm font-semibold">
              Tipo de imagem
              <select value={imageType} onChange={(event) => setImageType(event.target.value)} className={fieldClass + " mt-1"}>
                <option value="youtube_thumbnail">Thumbnail YouTube · 16:9</option>
                <option value="youtube_banner">Banner YouTube</option>
                <option value="logo">Logo</option>
                <option value="mockup">Mockup de produto · fundo branco</option>
              </select>
            </label>
            <p className="text-xs text-[var(--muted)]">A criação utiliza a franquia mensal de imagens do Digital Maker AI.</p>
            <button type="submit" disabled={!!busy || !imagePrompt.trim()} className={actionClass}>
              {busy === "generateImage" ? "Gerando imagem…" : "Gerar imagem"}
            </button>
          </form>
        </Panel>

        <Panel title="Pesquisa de canais sem rosto" description="Pesquise canais por nicho e potencial estimado de receita. As receitas são estimativas, não números oficiais dos canais.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={niche} onChange={(event) => setNiche(event.target.value)} className={fieldClass} placeholder="Ex.: tecnologia, projetores, gadgets" />
            <button type="button" onClick={() => void submitResearch("findChannels")} disabled={!!busy || !niche.trim()} className={actionClass}>
              {busy === "findChannels" ? "Pesquisando…" : "Pesquisar canais"}
            </button>
          </div>
        </Panel>

        <Panel title="Pesquisa de tendências" description="Consulte tendências armazenadas para identificar temas com interesse crescente. A busca é baseada no cache e não equivale a volume absoluto de pesquisas.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className={fieldClass} placeholder="Ex.: mini projetor 4K" />
            <button type="button" onClick={() => void submitResearch("searchTrends")} disabled={!!busy || !keyword.trim()} className={actionClass}>
              {busy === "searchTrends" ? "Consultando…" : "Consultar tendências"}
            </button>
          </div>
        </Panel>

        <Panel title="Acompanhar geração" description="Consulte progresso e link do vídeo criado pelo Digital Maker AI. A geração ocorre em segundo plano.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={jobId} onChange={(event) => setJobId(event.target.value)} className={fieldClass} placeholder="ID do job retornado na criação" />
            <button type="button" onClick={() => void checkVideo()} disabled={!!busy || !jobId.trim()} className={actionClass}>
              {busy === "checkVideo" ? "Consultando…" : "Verificar status"}
            </button>
          </div>
        </Panel>

        <Panel title="Último retorno do servidor" description="Resposta da ação mais recente, incluindo IDs, links e mensagens do provedor.">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface2)] p-3 text-xs leading-5">{pretty(latestResult)}</pre>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Conta e franquia" description="Informações oficiais retornadas pelo Digital Maker AI.">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface2)] p-3 text-xs leading-5">{pretty(account)}</pre>
        </Panel>
        <Panel title="Criações recentes" description="Biblioteca de itens registrados na conta Digital Maker AI.">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface2)] p-3 text-xs leading-5">{pretty(creations)}</pre>
        </Panel>
      </div>

      <details className="mt-5 rounded-2xl border border-border bg-[var(--surface)] p-5">
        <summary className="cursor-pointer font-heading font-bold">Opções do plano e ferramentas disponíveis</summary>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-bold">Opções aceitas pela conta</h3>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--surface2)] p-3 text-xs leading-5">{pretty(options)}</pre>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold">Ferramentas anunciadas pelo MCP ({tools.length})</h3>
            <ul className="max-h-80 space-y-2 overflow-auto rounded-xl bg-[var(--surface2)] p-3 text-xs leading-5">
              {tools.map((tool) => (
                <li key={tool.name}>
                  <span className="font-bold">{tool.name}</span>
                  {tool.description && <span className="block text-[var(--muted)]">{tool.description}</span>}
                </li>
              ))}
              {!tools.length && <li className="text-[var(--muted)]">Lista ainda não disponível.</li>}
            </ul>
          </div>
        </div>
      </details>

      <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
        Segurança: a chave não é enviada ao navegador. As chamadas são executadas no servidor Vetor após validação da sessão administrativa. Nenhuma publicação em rede social ou compra de pacote é iniciada por esta tela.
      </p>
    </div>
  );
}
