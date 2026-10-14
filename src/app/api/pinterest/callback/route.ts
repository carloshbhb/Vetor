import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangePinterestCode,
  savePinterestOAuthTokens,
} from "@/lib/pinterest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "vetor_pinterest_oauth_state";

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function redirect(request: NextRequest, result: string) {
  const response = NextResponse.redirect(new URL("/admin/pinterest/?pinterest=" + encodeURIComponent(result), request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return redirect(request, "authorization_denied");

  const code = params.get("code") || "";
  const returnedState = params.get("state") || "";
  const expectedState = request.cookies.get(STATE_COOKIE)?.value || "";
  if (!code || !returnedState || !expectedState || !safeCompare(returnedState, expectedState)) {
    return redirect(request, "invalid_oauth_state");
  }

  try {
    const tokenResponse = await exchangePinterestCode(code);
    await savePinterestOAuthTokens(tokenResponse);
    return redirect(request, "connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth Pinterest falhou.";
    console.error("[Pinterest OAuth] Callback failed:", message.slice(0, 220));
    return redirect(request, "connection_failed");
  }
}
