import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  try {
    const origin = new URL(request.url).origin;
    const cookie = createAdminSessionCookie(adminPassword);
    const cookieHeader = cookie.name + "=" + encodeURIComponent(cookie.value);

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
        { ok: false, error: payload.error || "Falha na sincronização Mercado Livre.", status: response.status },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      processed: payload.processed || 0,
      remaining: payload.remaining ?? null,
      results: payload.results || [],
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro no cron Mercado Livre." },
      { status: 500 }
    );
  }
}
