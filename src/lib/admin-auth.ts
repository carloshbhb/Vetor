import { NextResponse } from "next/server";

const FALLBACK_PASSWORD = "vetor-blog-admin-2026";

export function verifyAdminAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const envPassword = process.env.ADMIN_PASSWORD;

  const valid =
    authHeader === `Bearer ${FALLBACK_PASSWORD}` ||
    (envPassword && authHeader === `Bearer ${envPassword}`);

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
