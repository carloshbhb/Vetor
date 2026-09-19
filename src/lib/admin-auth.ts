import { NextResponse } from "next/server";

export function verifyAdminAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envPassword) {
    return NextResponse.json({ error: "Server misconfiguration: ADMIN_PASSWORD not set" }, { status: 500 });
  }

  if (authHeader === `Bearer ${envPassword}`) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
