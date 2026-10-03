import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  createOAuthState,
  getAuthorizationUrl,
  getMercadoLivreRedirectUri,
  hasValidSession,
  getSessionInfo,
  ML_OAUTH_STATE_COOKIE,
} from "@/lib/mercadolivre-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;

  if (searchParams.get("status") === "true") {
    const hasSession = await hasValidSession();
    const session = await getSessionInfo();

    return NextResponse.json({
      authenticated: hasSession,
      userId: session?.userId || null,
      expiresAt: session?.expiresAt || null,
    });
  }

  const redirectUri = getMercadoLivreRedirectUri();
  const state = createOAuthState();
  const authUrl = getAuthorizationUrl(redirectUri, state);

  const response = NextResponse.json({
    authorizationUrl: authUrl,
    redirectUri,
    message: "Visit the authorizationUrl to authorize the application",
  });

  response.cookies.set(ML_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/ml",
    maxAge: 10 * 60,
  });

  return response;
}
