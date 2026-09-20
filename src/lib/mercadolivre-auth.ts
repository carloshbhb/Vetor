/**
 * Mercado Livre OAuth 2.0 Authentication
 * Documentation: https://developers.mercadolivre.com.br/en_us/authentication-and-authorization
 */

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

// In-memory token store (should be persisted in production)
let currentSession: MLSession | null = null;

/**
 * Generate the authorization URL for OAuth 2.0 flow
 * User must visit this URL to authorize the app
 */
export function getAuthorizationUrl(redirectUri: string): string {
  const clientId = process.env.ML_CLIENT_ID;
  const state = process.env.ML_REDIRECT_URI || redirectUri;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId || '',
    redirect_uri: redirectUri,
    state: state,
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

  const response = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
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

  const response = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
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
 * Save session (should use database in production)
 */
export function saveSession(tokenResponse: MLTokenResponse): MLSession {
  currentSession = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    userId: tokenResponse.user_id,
  };

  console.log(`[ML Auth] Session saved. Expires in ${tokenResponse.expires_in}s`);
  return currentSession;
}

/**
 * Get valid access token (refreshes if needed)
 */
export async function getValidAccessToken(): Promise<string> {
  // Try to load from environment first
  if (!currentSession) {
    const envToken = process.env.ML_ACCESS_TOKEN;
    const envRefresh = process.env.ML_REFRESH_TOKEN;

    if (envToken && envRefresh) {
      currentSession = {
        accessToken: envToken,
        refreshToken: envRefresh,
        expiresAt: Date.now() + 3600 * 1000, // Assume 1 hour
      };
    }
  }

  if (!currentSession) {
    throw new Error('No ML session available. Please complete OAuth flow first.');
  }

  // Check if token is expired (with 5 min buffer)
  if (Date.now() > currentSession.expiresAt - 5 * 60 * 1000) {
    console.log('[ML Auth] Token expired, refreshing...');
    const tokenResponse = await refreshAccessToken(currentSession.refreshToken);
    saveSession(tokenResponse);
  }

  return currentSession.accessToken;
}

/**
 * Check if we have a valid session
 */
export function hasValidSession(): boolean {
  if (!currentSession) return false;
  return Date.now() < currentSession.expiresAt - 5 * 60 * 1000;
}

/**
 * Get current session info
 */
export function getSessionInfo(): MLSession | null {
  return currentSession;
}
