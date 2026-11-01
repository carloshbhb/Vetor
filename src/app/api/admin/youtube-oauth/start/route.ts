import { createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "vetor_youtube_oauth_state";
const STATE_COOKIE_PATH = "/api/admin/youtube-oauth";
const REDIRECT_URI = "https://www.vetor.blog/api/admin/youtube-oauth/callback";
const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

function signState(nonce: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET;
  if (!secret) throw new Error("OAuth state signing secret is not configured.");
  return createHmac("sha256", secret).update("vetor-youtube-oauth:" + nonce).digest("hex");
}

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId || !process.env.YOUTUBE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Credenciais OAuth do YouTube não configuradas no ambiente Production." }, { status: 503 });
  }

  const nonce = randomBytes(32).toString("hex");
  const state = nonce + "." + signState(nonce);
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("prompt", "consent");
  authorizationUrl.searchParams.set("include_granted_scopes", "true");
  authorizationUrl.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  authorizationUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizationUrl, 302);
  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
