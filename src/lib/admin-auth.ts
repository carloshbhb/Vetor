import { NextResponse } from "next/server";

const FALLBACK_PASSWORD = "vetor-blog-admin-2026";

export function verifyAdminAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const envPassword = process.env.ADMIN_PASSWORD;

  const checkFallback = authHeader === `Bearer ${FALLBACK_PASSWORD}`;
  const checkEnv = !!(envPassword && authHeader === `Bearer ${envPassword}`);

  const valid = checkFallback || checkEnv;

  if (!valid) {
    return NextResponse.json({
      error: "Unauthorized",
      debug: {
        authHeaderLen: authHeader ? authHeader.length : 0,
        envExists: envPassword !== undefined,
        envLen: envPassword ? envPassword.length : 0,
        checkFallback,
        checkEnv,
      },
    }, { status: 401 });
  }

  return null;
}
