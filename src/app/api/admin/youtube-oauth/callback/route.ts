import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "vetor_youtube_oauth_state";
const STATE_COOKIE_PATH = "/api/admin/youtube-oauth";
const REDIRECT_URI = "https://www.vetor.blog/api/admin/youtube-oauth/callback";
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

function getCookie(request: Request, name: string): string | null {
  const item = (request.headers.get("cookie") || "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(name + "="));
  if (!item) return null;
  try { return decodeURIComponent(item.slice(name.length + 1)); } catch { return null; }
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyState(state: string, cookie: string): boolean {
  if (!state || !cookie || !safeEqual(state, cookie)) return false;
  const [nonce, signature, extra] = state.split(".");
  if (!nonce || !signature || extra) return false;
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update("vetor-youtube-oauth:" + nonce).digest("hex");
  return safeEqual(signature, expected);
}

function redirectResult(status: string, detail?: string) {
  const target = new URL("/admin/videos", "https://www.vetor.blog");
  target.searchParams.set("youtube_oauth", status);
  if (detail) target.searchParams.set("reason", detail.slice(0, 64));
  const response = NextResponse.redirect(target, 303);
  response.cookies.set({
    name: STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) {
    const login = new URL("/admin/login", "https://www.vetor.blog");
    login.searchParams.set("next", "/admin/videos");
    return NextResponse.redirect(login, 303);
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const cookieState = getCookie(request, STATE_COOKIE);
  if (!verifyState(state, cookieState || "")) return redirectResult("error", "invalid_state");
  if (url.searchParams.has("error")) return redirectResult("error", "consent_denied");

  const code = url.searchParams.get("code");
  if (!code) return redirectResult("error", "missing_code");

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectResult("error", "oauth_not_configured");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const tokenData = await tokenResponse.json().catch(() => ({})) as Record<string, any>;
    if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
      const reason = typeof tokenData.error === "string" ? tokenData.error : "token_exchange_failed";
      console.error("[youtube-oauth] token exchange failed: " + reason);
      return redirectResult("error", reason);
    }

    const grantedScopes = String(tokenData.scope || "").split(/\s+/).filter(Boolean);
    const missingScopes = REQUIRED_SCOPES.filter((scope) => !grantedScopes.includes(scope));
    if (missingScopes.length) {
      console.error("[youtube-oauth] requested scopes were not fully granted.");
      return redirectResult("error", "missing_required_scopes");
    }

    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("part", "id,snippet");
    channelUrl.searchParams.set("mine", "true");
    const channelResponse = await fetch(channelUrl, {
      headers: { Authorization: "Bearer " + tokenData.access_token },
      signal: AbortSignal.timeout(12000),
    });
    const channelData = await channelResponse.json().catch(() => ({})) as Record<string, any>;
    const channel = Array.isArray(channelData.items) ? channelData.items[0] : null;
    if (!channelResponse.ok || !channel?.id) {
      console.error("[youtube-oauth] channel verification failed: HTTP " + channelResponse.status);
      return redirectResult("error", "channel_verification_failed");
    }

    const refreshToken = typeof tokenData.refresh_token === "string" ? tokenData.refresh_token.trim() : "";
    if (!refreshToken) {
      return redirectResult("error", "refresh_token_not_returned");
    }

    const supabase = getSupabaseServiceKeyClient();
    if (!supabase) return redirectResult("error", "supabase_unavailable");

    const { error: saveError } = await supabase.from("youtube_oauth_credentials").upsert({
      provider: "youtube",
      refresh_token: refreshToken,
      granted_scopes: grantedScopes.join(" "),
      channel_id: String(channel.id),
      channel_title: String(channel.snippet?.title || ""),
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider" });
    if (saveError) {
      console.error("[youtube-oauth] credential save failed: " + saveError.message);
      return redirectResult("error", "credential_save_failed");
    }

    console.log("[youtube-oauth] channel authorized: " + String(channel.id));
    return redirectResult("connected");
  } catch (error) {
    console.error("[youtube-oauth] callback failed: " + String(error instanceof Error ? error.message : error).slice(0, 300));
    return redirectResult("error", "callback_failed");
  }
}
