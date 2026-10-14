import { randomUUID } from "node:crypto";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

const API_BASE = "https://api.pinterest.com/v5";
const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const ACCESS_TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
const LEGACY_TOKEN_MAX_AGE_MS = 25 * 24 * 60 * 60 * 1000;

type PinterestConfig = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  board_id: string;
  board_name: string | null;
  expires_at: string | null;
  refresh_token_expires_at: string | null;
  scopes: string | null;
  token_type: string | null;
  created_at: string;
  updated_at: string;
};

export type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
};

type PinterestTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  refresh_token_expires_at?: number;
  scope?: string;
  token_type?: string;
};

function getCredentials() {
  const clientId = process.env.PINTEREST_CLIENT_ID?.trim();
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET?.trim();
  return { clientId, clientSecret, ready: Boolean(clientId && clientSecret) };
}

export function hasPinterestAppCredentials() {
  return getCredentials().ready;
}

export function getPinterestRedirectUri() {
  return process.env.PINTEREST_REDIRECT_URI?.trim() || "https://www.vetor.blog/api/pinterest/callback";
}

function getSupabase() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error("Supabase Service Role não está configurado no servidor.");
  return supabase;
}

export async function getPinterestConfig(): Promise<PinterestConfig | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pinterest_config")
    .select("id,access_token,refresh_token,board_id,board_name,expires_at,refresh_token_expires_at,scopes,token_type,created_at,updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error) throw new Error("Não foi possível ler a configuração do Pinterest no Supabase.");
  return (data as PinterestConfig | null) || null;
}

export async function getPinterestConnectionInfo() {
  const config = await getPinterestConfig();
  const appConfigured = hasPinterestAppCredentials();
  const hasToken = Boolean(config?.access_token);
  const hasRefreshToken = Boolean(config?.refresh_token);
  const boardId = config?.board_id || "";
  const boardConfigured = Boolean(boardId && boardId !== "pending-board-selection");
  const expiresAt = config?.expires_at ? new Date(config.expires_at).getTime() : null;
  const tokenExpired = expiresAt !== null && expiresAt <= Date.now();
  const oldLegacyToken = Boolean(
    hasToken &&
    !hasRefreshToken &&
    config?.updated_at &&
    Date.now() - new Date(config.updated_at).getTime() > LEGACY_TOKEN_MAX_AGE_MS
  );
  const needsReconnect = Boolean(hasToken && (!hasRefreshToken || (tokenExpired && !hasRefreshToken) || oldLegacyToken));
  const ready = Boolean(appConfigured && hasToken && hasRefreshToken && boardConfigured && !needsReconnect);

  let message = "Configure as credenciais do aplicativo Pinterest no Vercel.";
  if (appConfigured && !hasToken) message = "Conecte a conta Pinterest para autorizar a publicação.";
  if (appConfigured && hasToken && needsReconnect) message = "Reconecte o Pinterest para obter um token renovável.";
  if (appConfigured && hasToken && hasRefreshToken && !boardConfigured) message = "Escolha o quadro que receberá os Pins.";
  if (ready) message = "Aplicativo, token renovável e quadro configurados.";

  return {
    appConfigured,
    hasToken,
    hasRefreshToken,
    boardConfigured,
    needsReconnect,
    ready,
    message,
    boardId: boardConfigured ? boardId : null,
    boardName: config?.board_name || null,
    expiresAt: config?.expires_at || null,
    refreshTokenExpiresAt: config?.refresh_token_expires_at || null,
    scopes: config?.scopes || null,
    updatedAt: config?.updated_at || null,
  };
}

export function createPinterestAuthorizationUrl(state: string) {
  const { clientId, ready } = getCredentials();
  if (!ready || !clientId) {
    throw new Error("Configure PINTEREST_CLIENT_ID e PINTEREST_CLIENT_SECRET no ambiente Production do Vercel.");
  }

  const url = new URL("https://www.pinterest.com/oauth/");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getPinterestRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "boards:read,boards:write,pins:read,pins:write");
  url.searchParams.set("state", state);
  return url.toString();
}

function tokenAuthorizationHeader() {
  const { clientId, clientSecret, ready } = getCredentials();
  if (!ready || !clientId || !clientSecret) {
    throw new Error("Configure PINTEREST_CLIENT_ID e PINTEREST_CLIENT_SECRET no Vercel.");
  }
  return "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64");
}

async function requestToken(params: URLSearchParams): Promise<PinterestTokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: tokenAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const body = await response.json().catch(() => ({})) as Partial<PinterestTokenResponse> & { message?: string; error?: string };
  if (!response.ok || !body.access_token) {
    const reason = typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : "erro do endpoint OAuth";
    throw new Error("O Pinterest recusou a autenticação OAuth (" + response.status + "): " + reason.slice(0, 180));
  }
  return body as PinterestTokenResponse;
}

export async function exchangePinterestCode(code: string): Promise<PinterestTokenResponse> {
  const params = new URLSearchParams();
  params.set("grant_type", "authorization_code");
  params.set("code", code);
  params.set("redirect_uri", getPinterestRedirectUri());
  params.set("continuous_refresh", "true");
  return requestToken(params);
}

async function refreshPinterestToken(config: PinterestConfig): Promise<string> {
  if (!config.refresh_token) {
    throw new Error("O token atual não possui refresh token. Reconecte a conta Pinterest pelo painel.");
  }

  if (config.refresh_token_expires_at && new Date(config.refresh_token_expires_at).getTime() <= Date.now()) {
    throw new Error("O refresh token expirou. Reconecte a conta Pinterest pelo painel.");
  }

  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", config.refresh_token);
  const body = await requestToken(params);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (Number(body.expires_in) || ACCESS_TOKEN_LIFETIME_SECONDS) * 1000).toISOString();
  const updates: Record<string, unknown> = {
    access_token: body.access_token,
    expires_at: expiresAt,
    updated_at: now.toISOString(),
  };
  if (body.refresh_token) updates.refresh_token = body.refresh_token;
  if (body.refresh_token_expires_at) {
    updates.refresh_token_expires_at = new Date(body.refresh_token_expires_at * 1000).toISOString();
  } else if (body.refresh_token_expires_in) {
    updates.refresh_token_expires_at = new Date(now.getTime() + body.refresh_token_expires_in * 1000).toISOString();
  }
  if (body.scope) updates.scopes = body.scope;
  if (body.token_type) updates.token_type = body.token_type;

  const supabase = getSupabase();
  const { error } = await supabase.from("pinterest_config").update(updates).eq("id", "default");
  if (error) throw new Error("O token Pinterest foi renovado, mas não foi possível salvar a renovação no Supabase.");
  return body.access_token;
}

export async function getPinterestAccessToken(forceRefresh = false): Promise<string> {
  const config = await getPinterestConfig();
  if (!config?.access_token) throw new Error("Conta Pinterest não conectada. Use Conectar Pinterest no painel.");

  const expiry = config.expires_at ? new Date(config.expires_at).getTime() : null;
  const needsRefresh = forceRefresh || (expiry !== null && expiry <= Date.now() + TOKEN_REFRESH_SKEW_MS);
  if (needsRefresh) return refreshPinterestToken(config);

  if (!config.refresh_token && config.updated_at &&
      Date.now() - new Date(config.updated_at).getTime() > LEGACY_TOKEN_MAX_AGE_MS) {
    throw new Error("A credencial antiga do Pinterest não tem refresh token e não pode ser renovada. Reconecte a conta no painel.");
  }

  return config.access_token;
}

export async function savePinterestOAuthTokens(body: PinterestTokenResponse) {
  const supabase = getSupabase();
  const existing = await getPinterestConfig();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (Number(body.expires_in) || ACCESS_TOKEN_LIFETIME_SECONDS) * 1000).toISOString();
  const payload = {
    id: "default",
    access_token: body.access_token,
    refresh_token: body.refresh_token || null,
    board_id: existing?.board_id || "pending-board-selection",
    board_name: existing?.board_name || null,
    expires_at: expiresAt,
    refresh_token_expires_at: body.refresh_token_expires_at
      ? new Date(body.refresh_token_expires_at * 1000).toISOString()
      : body.refresh_token_expires_in
        ? new Date(now.getTime() + body.refresh_token_expires_in * 1000).toISOString()
        : null,
    scopes: body.scope || null,
    token_type: body.token_type || "bearer",
    updated_at: now.toISOString(),
    created_at: existing?.created_at || now.toISOString(),
  };

  const { error } = await supabase.from("pinterest_config").upsert(payload, { onConflict: "id" });
  if (error) throw new Error("A autorização foi concluída, mas não foi possível guardar a configuração no Supabase.");
}

export async function setPinterestBoard(boardId: string, boardName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pinterest_config")
    .update({ board_id: boardId, board_name: boardName, updated_at: new Date().toISOString() })
    .eq("id", "default")
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Não foi possível salvar o quadro no Supabase.");
}

export async function pinterestApiRequest(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const send = async (token: string) => fetch(API_BASE + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  let token = await getPinterestAccessToken();
  let response = await send(token);
  if (response.status === 401) {
    token = await getPinterestAccessToken(true);
    response = await send(token);
  }

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const detail = typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : "requisição rejeitada";
    throw new Error("Pinterest API (" + response.status + "): " + detail.slice(0, 220));
  }
  return body;
}

export async function listPinterestBoards(): Promise<PinterestBoard[]> {
  const response = await pinterestApiRequest("/boards?page_size=100");
  const items = Array.isArray(response.items) ? response.items : [];
  return items.filter((item): item is PinterestBoard => {
    if (!item || typeof item !== "object") return false;
    const board = item as Record<string, unknown>;
    return typeof board.id === "string" && typeof board.name === "string";
  });
}

export async function queuePublishedReviewPins(limit = 10) {
  const supabase = getSupabase();
  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("id,slug,product,category,image_url,meta_title,meta_description,content_type,updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(150);
  if (reviewsError) throw new Error("Não foi possível consultar os reviews/LPs publicados.");

  const { data: existing, error: queueError } = await supabase
    .from("pinterest_scheduled_pins")
    .select("review_slug,status,scheduled_at,published_at")
    .order("scheduled_at", { ascending: false })
    .limit(500);
  if (queueError) throw new Error("Não foi possível consultar a fila de Pins.");

  const rows = existing || [];
  const existingSlugs = new Set(rows.map((row) => String(row.review_slug || "")));
  const allowed = (reviews || []).filter((review) => {
    if (!review.slug || existingSlugs.has(String(review.slug))) return false;
    if (typeof review.image_url !== "string" || !review.image_url.trim()) return false;
    try {
      const image = new URL(review.image_url);
      if (image.protocol !== "https:") return false;
    } catch {
      return false;
    }
    return true;
  });

  const candidateLimit = Math.max(1, Math.min(limit, 25));
  const candidates = allowed.slice(0, candidateLimit);
  const nowMs = Date.now();
  let lastTime = nowMs - 24 * 60 * 60 * 1000;
  for (const row of rows) {
    if (row.status === "pending" || row.status === "publishing") {
      const timestamp = new Date(row.scheduled_at).getTime();
      if (Number.isFinite(timestamp) && timestamp > lastTime) lastTime = timestamp;
    }
    if (row.status === "published" && row.published_at) {
      const timestamp = new Date(row.published_at).getTime() + 24 * 60 * 60 * 1000;
      if (Number.isFinite(timestamp) && timestamp > lastTime) lastTime = timestamp;
    }
  }

  const inserted = candidates.map((review, index) => {
    const titleSource = typeof review.meta_title === "string" && review.meta_title.trim()
      ? review.meta_title.trim()
      : String(review.product || review.slug) + " | análise e guia de compra";
    const descriptionSource = typeof review.meta_description === "string" && review.meta_description.trim()
      ? review.meta_description.trim()
      : "Confira a análise de " + String(review.product || review.slug) + " no Vetor.blog. Compare especificações e confirme preço, estoque e condições atuais antes de comprar.";
    const scheduledAt = new Date(lastTime + (index + 1) * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: randomUUID(),
      review_id: String(review.id || review.slug),
      review_slug: String(review.slug),
      content_type: review.content_type === "lp" ? "lp" : "review",
      title: titleSource.slice(0, 100),
      description: descriptionSource.slice(0, 500),
      image_url: String(review.image_url),
      link_url: "https://www.vetor.blog/reviews/" + encodeURIComponent(String(review.slug)) + "/",
      scheduled_at: scheduledAt,
      status: "pending",
      attempts: 0,
      updated_at: new Date().toISOString(),
    };
  });

  if (inserted.length) {
    const { error } = await supabase
      .from("pinterest_scheduled_pins")
      .upsert(inserted, { onConflict: "review_slug", ignoreDuplicates: true });
    if (error) throw new Error("Não foi possível adicionar os Pins à fila.");
  }
  return { queued: inserted.length, examined: (reviews || []).length, ignored: (reviews || []).length - inserted.length };
}

export async function publishDuePinterestPins(limit = 1) {
  const supabase = getSupabase();
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  await supabase
    .from("pinterest_scheduled_pins")
    .update({ status: "pending", updated_at: now.toISOString() })
    .eq("status", "publishing")
    .lt("updated_at", staleCutoff);

  const { data: due, error } = await supabase
    .from("pinterest_scheduled_pins")
    .select("id,review_slug,title,description,image_url,link_url,scheduled_at,attempts")
    .eq("status", "pending")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 3)));
  if (error) throw new Error("Não foi possível buscar Pins prontos para publicação.");

  const results: Array<{ slug: string; status: string; pinId?: string; error?: string }> = [];
  for (const pin of due || []) {
    const claimedAt = new Date().toISOString();
    const nextAttempts = Number(pin.attempts || 0) + 1;
    const { data: claimed, error: claimError } = await supabase
      .from("pinterest_scheduled_pins")
      .update({ status: "publishing", attempts: nextAttempts, updated_at: claimedAt })
      .eq("id", pin.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) continue;

    try {
      const config = await getPinterestConfig();
      if (!config?.board_id || config.board_id === "pending-board-selection") {
        throw new Error("Selecione um quadro Pinterest antes de publicar.");
      }
      const response = await pinterestApiRequest("/pins", {
        method: "POST",
        body: JSON.stringify({
          board_id: config.board_id,
          title: String(pin.title || pin.review_slug).slice(0, 100),
          description: String(pin.description || "").slice(0, 500),
          link: pin.link_url || "https://www.vetor.blog/reviews/" + encodeURIComponent(String(pin.review_slug)) + "/",
          media_source: {
            source_type: "image_url",
            url: pin.image_url,
            is_standard: true,
          },
        }),
      });
      const pinId = typeof response.id === "string" ? response.id : "";
      if (!pinId) throw new Error("O Pinterest aceitou a requisição, mas não retornou o ID do Pin.");
      const publishedAt = new Date().toISOString();
      const { error: saveError } = await supabase
        .from("pinterest_scheduled_pins")
        .update({
          status: "published",
          pin_id: pinId,
          published_at: publishedAt,
          error: null,
          updated_at: publishedAt,
        })
        .eq("id", pin.id);
      if (saveError) throw new Error("Pin criado, mas o Supabase não confirmou o registro da publicação.");
      results.push({ slug: String(pin.review_slug), status: "published", pinId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida na publicação.";
      await supabase
        .from("pinterest_scheduled_pins")
        .update({ status: "failed", error: message.slice(0, 1500), updated_at: new Date().toISOString() })
        .eq("id", pin.id);
      results.push({ slug: String(pin.review_slug), status: "failed", error: message.slice(0, 220) });
    }
  }
  return { processed: results.length, results };
}

export async function getPinterestQueue(limit = 20) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pinterest_scheduled_pins")
    .select("id,review_slug,content_type,title,description,image_url,link_url,scheduled_at,status,pin_id,error,attempts,published_at,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw new Error("Não foi possível carregar a fila Pinterest.");
  return data || [];
}

export async function retryFailedPinterestPins() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pinterest_scheduled_pins")
    .update({ status: "pending", scheduled_at: new Date().toISOString(), error: null, updated_at: new Date().toISOString() })
    .eq("status", "failed")
    .select("id");
  if (error) throw new Error("Não foi possível reagendar os Pins que falharam.");
  return { retried: (data || []).length };
}
