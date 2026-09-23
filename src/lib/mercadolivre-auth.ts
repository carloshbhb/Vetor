/**
 * Mercado Livre OAuth 2.0 Authentication
 * Documentation: https://developers.mercadolivre.com.br/en_us/authentication-and-authorization
 */

import { getSupabaseServiceKeyClient } from './supabase';

const ML_AUTH_URL = 'https://auth.mercadolivre.com.br';
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';

export interface MLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
  user_id?: number;
}

export interface MLSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: number;
}

/**
 * Generate the authorization URL for OAuth 2.0 flow
 */
export function getAuthorizationUrl(redirectUri: string): string {
  const clientId = process.env.ML_CLIENT_ID;
  const state = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId || '',
    redirect_uri: redirectUri,
    state,
  });

  return `${ML_AUTH_URL}/authorization?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<MLTokenResponse> {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('ML_CLIENT_ID and ML_CLIENT_SECRET must be set');
  }

  console.log('[ML Auth] Exchanging code for token...');
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<MLTokenResponse> {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('ML_CLIENT_ID and ML_CLIENT_SECRET must be set');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Fetch user ID from ML API using access token
 */
async function fetchUserId(accessToken: string): Promise<number | null> {
  try {
    console.log('[ML Auth] Fetching user ID from API...');
    const response = await fetch('https://api.mercadolibre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[ML Auth] Failed to fetch user ID:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    console.log('[ML Auth] Got user ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('[ML Auth] Error fetching user ID:', error);
    return null;
  }
}

/**
 * Save session to Supabase
 */
export async function saveSession(tokenResponse: MLTokenResponse): Promise<MLSession> {
  let userId = tokenResponse.user_id;

  // If user_id not in token response, fetch it from API
  if (!userId) {
    userId = await fetchUserId(tokenResponse.access_token) || undefined;
  }

  const session: MLSession = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    userId,
  };

  if (session.userId) {
    console.log('[ML Auth] Saving session for user:', session.userId);
    const supabase = getSupabaseServiceKeyClient();
    if (!supabase) {
      console.error('[ML Auth] Supabase client not available');
      return session;
    }
    const { data, error } = await supabase
      .from('ml_tokens')
      .upsert({
        user_id: session.userId,
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
        expires_at: new Date(session.expiresAt).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select();

    if (error) {
      console.error('[ML Auth] Failed to save session to Supabase:', JSON.stringify(error));
    } else {
      console.log('[ML Auth] Session saved to Supabase:', JSON.stringify(data));
    }
  } else {
    console.error('[ML Auth] Could not determine user ID');
  }

  return session;
}

/**
 * Load session from Supabase
 */
async function loadSessionFromSupabase(): Promise<MLSession | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('ml_tokens')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at).getTime(),
    userId: data.user_id,
  };
}

/**
 * Get valid access token (refreshes if needed)
 */
export async function getValidAccessToken(): Promise<string> {
  // Try to load from Supabase if no in-memory session
  let session = await loadSessionFromSupabase();

  if (!session) {
    throw new Error('No ML session available. Please complete OAuth flow first.');
  }

  // Check if token is expired (with 5 min buffer)
  if (Date.now() > session.expiresAt - 5 * 60 * 1000) {
    console.log('[ML Auth] Token expired, refreshing...');
    const tokenResponse = await refreshAccessToken(session.refreshToken);
    const newSession = await saveSession(tokenResponse);
    return newSession.accessToken;
  }

  return session.accessToken;
}

/**
 * Check if we have a valid session
 */
export async function hasValidSession(): Promise<boolean> {
  const session = await loadSessionFromSupabase();
  if (!session) return false;
  return Date.now() < session.expiresAt - 5 * 60 * 1000;
}

/**
 * Get current session info
 */
export async function getSessionInfo(): Promise<MLSession | null> {
  return loadSessionFromSupabase();
}
