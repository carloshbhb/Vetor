/**
 * Mercado Livre OAuth 2.0 Authentication
 * Documentation: https://developers.mercadolivre.com.br/pt_br/mensagens-post-venda/autenticacao-e-autorizacao
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

const ML_AUTH_URL = "https://auth.mercadolivre.com.br";
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
export const ML_OAUTH_STATE_COOKIE = "vetor_ml_oauth_state";

export interface MLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string | null;
  user_id?: number;
}

export interface MLSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: number;
  scope?: string;
}

export function getMercadoLivreRedirectUri(): string {
  const value = process.env.ML_REDIRECT_URI?.trim();
  return value || "https://www.vetor.blog/api/ml/callback";
}

export function createOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function safeCompareState(received: string, expected: string): boolean {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const clientId = process.env.ML_CLIENT_ID;
  if (!clientId) throw new Error("ML_CLIENT_ID must be set.");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "offline_access read write",
  });

  return ML_AUTH_URL + "/authorization?" + params.toString();
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<MLTokenResponse> {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("ML_CLIENT_ID and ML_CLIENT_SECRET must be set");
  }

  const credentials = btoa(clientId + ":" + clientSecret);
  const response = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: "Basic " + credentials,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error("Failed to exchange code: " + response.status + " - " + error);
  }

  const data = (await response.json()) as MLTokenResponse;
  if (!data.refresh_token) data.refresh_token = "";
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<MLTokenResponse> {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("ML_CLIENT_ID and ML_CLIENT_SECRET must be set");
  }

  const credentials = btoa(clientId + ":" + clientSecret);
  const response = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: "Basic " + credentials,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error("Failed to refresh code: " + response.status + " - " + error);
  }

  return (await response.json()) as MLTokenResponse;
}

async function fetchUserId(accessToken: string): Promise<number | null> {
  try {
    const response = await fetch("https://api.mercadolibre.com/users/me", {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.id == null ? null : Number(data.id);
  } catch {
    return null;
  }
}

export async function saveSession(tokenResponse: MLTokenResponse): Promise<MLSession> {
  let userId = tokenResponse.user_id;
  if (!userId) userId = (await fetchUserId(tokenResponse.access_token)) || undefined;

  const session: MLSession = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || "",
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    userId,
    scope: tokenResponse.scope,
  };

  if (!session.userId) {
    throw new Error("Could not determine ML user ID");
  }

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error("Supabase client not available");

  // ml_tokens intentionally keeps a single current session (primary key: id).
  // Do not upsert on user_id: the table does not enforce that column as unique.
  const { error } = await supabase.from("ml_tokens").upsert({
    id: "current",
    user_id: session.userId,
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: new Date(session.expiresAt).toISOString(),
    scope: session.scope || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) throw new Error("Failed to save ML session: " + error.message);
  return session;
}

async function loadSessionFromSupabase(): Promise<MLSession | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("ml_tokens")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token || ""),
    expiresAt: new Date(String(data.expires_at)).getTime(),
    userId: data.user_id == null ? undefined : Number(data.user_id),
    scope: data.scope ? String(data.scope) : undefined,
  };
}

export async function getValidAccessToken(): Promise<string> {
  const session = await loadSessionFromSupabase();

  if (!session) {
    throw new Error("No ML session available. Please complete OAuth flow first.");
  }

  if (Date.now() <= session.expiresAt - 5 * 60 * 1000) {
    return session.accessToken;
  }

  if (!session.refreshToken) {
    throw new Error("ML access token expired and no refresh_token is available. Please re-authorize.");
  }

  const tokenResponse = await refreshAccessToken(session.refreshToken);
  return (await saveSession(tokenResponse)).accessToken;
}

export async function hasValidSession(): Promise<boolean> {
  // Let the token loader attempt OAuth refresh before showing the integration
  // as disconnected. Mercado Livre access tokens expire regularly, while a
  // valid refresh token can keep the admin integration connected.
  try {
    await getValidAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function getSessionInfo(): Promise<MLSession | null> {
  return loadSessionFromSupabase();
}
