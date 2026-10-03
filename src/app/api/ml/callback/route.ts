import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getMercadoLivreRedirectUri,
  ML_OAUTH_STATE_COOKIE,
  safeCompareState,
  saveSession,
} from "@/lib/mercadolivre-auth";

export const dynamic = "force-dynamic";

function redirectResponse(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete(ML_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[ML OAuth] Authorization error:", error);
    return redirectResponse(
      request,
      "/admin/ml/?error=ml_auth_failed&reason=" + encodeURIComponent(error)
    );
  }

  const expectedState = request.cookies.get(ML_OAUTH_STATE_COOKIE)?.value || "";
  if (!returnedState || !expectedState || !safeCompareState(returnedState, expectedState)) {
    console.error("[ML OAuth] Invalid or missing OAuth state");
    return redirectResponse(request, "/admin/ml/?error=ml_invalid_state");
  }

  if (!code) {
    console.error("[ML OAuth] No authorization code received");
    return redirectResponse(request, "/admin/ml/?error=ml_no_code");
  }

  try {
    const redirectUri = getMercadoLivreRedirectUri();
    const tokenResponse = await exchangeCodeForToken(code, redirectUri);
    await saveSession(tokenResponse);
    return redirectResponse(request, "/admin/ml/?success=ml_authorized");
  } catch (error) {
    console.error("[ML OAuth] Token exchange failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return redirectResponse(
      request,
      "/admin/ml/?error=ml_token_exchange_failed&detail=" + encodeURIComponent(detail)
    );
  }
}
