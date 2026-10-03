import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TOKEN_SHA256 = "bf552a3853d003225adc4a45943a7f2b764d0b897a12d69a8fd5e9b35f8f3fb3";
const EXPIRES_AT = 1791067661129;

function validToken(value: string | null) {
  if (!value || Date.now() > EXPIRES_AT) return false;
  const digest = createHash("sha256").update(value, "utf8").digest("hex");
  return digest === TOKEN_SHA256;
}

export async function GET(request: NextRequest) {
  if (!validToken(request.nextUrl.searchParams.get("token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const cookie = createAdminSessionCookie(adminPassword);
  const cookieHeader = cookie.name + "=" + encodeURIComponent(cookie.value);

  const batches: Array<Record<string, unknown>> = [];
  let processed = 0;

  for (let i = 0; i < 5; i += 1) {
    const response = await fetch(origin + "/api/admin/mercadolivre/batch", {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify({ limit: 20 }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, processed, batches, error: payload.error || "Falha na fila.", status: response.status },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    batches.push(payload);
    processed += Number(payload.processed || 0);

    if (!payload.processed) break;
  }

  return NextResponse.json(
    { ok: true, processed, batches, ranAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
