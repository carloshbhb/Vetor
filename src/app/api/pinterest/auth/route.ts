import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createPinterestAuthorizationUrl } from "@/lib/pinterest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "vetor_pinterest_oauth_state";

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const state = randomBytes(32).toString("hex");
    const authorizationUrl = createPinterestAuthorizationUrl(state);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/pinterest/callback",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar o OAuth Pinterest.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
