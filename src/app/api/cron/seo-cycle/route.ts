import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  try {
    const origin = new URL(request.url).origin;
    const cookie = createAdminSessionCookie(adminPassword);
    const cookieHeader = `${cookie.name}=${encodeURIComponent(cookie.value)}`;

    const dashboardResponse = await fetch(`${origin}/api/admin/opportunities`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!dashboardResponse.ok) {
      return NextResponse.json(
        { error: "Não foi possível atualizar o dashboard SEO.", status: dashboardResponse.status },
        { status: 502 }
      );
    }

    const dashboard = await dashboardResponse.json();
    const actions = Array.isArray(dashboard.actionQueue) ? dashboard.actionQueue : [];

    const syncResponse = await fetch(`${origin}/api/admin/seo-actions`, {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify({ actions }),
      cache: "no-store",
    });
    if (!syncResponse.ok) {
      return NextResponse.json(
        { error: "Não foi possível sincronizar o ciclo SEO.", status: syncResponse.status },
        { status: 502 }
      );
    }

    const sync = await syncResponse.json();

    const impactResponse = await fetch(`${origin}/api/admin/seo-actions`, {
      method: "PUT",
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!impactResponse.ok) {
      return NextResponse.json(
        { error: "Não foi possível medir impactos SEO.", status: impactResponse.status },
        { status: 502 }
      );
    }

    const impact = await impactResponse.json();

    return NextResponse.json({
      ok: true,
      synced: sync.synced || 0,
      resolved: sync.resolved || 0,
      measured: impact.measured || 0,
      waiting: impact.waiting || 0,
      noData: impact.noData || 0,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no ciclo SEO." },
      { status: 500 }
    );
  }
}
