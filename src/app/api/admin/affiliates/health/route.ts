import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getAffiliateLinksByIds, updateAffiliateHealth, type AffiliateLink } from "@/lib/affiliate-links";

async function checkDestination(item: AffiliateLink) {
  const started = Date.now();
  try {
    const response = await fetch(item.destination_url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const finalUrl = response.url || item.destination_url;
    const healthStatus = response.status >= 400
      ? "error"
      : finalUrl !== item.destination_url
        ? "redirect"
        : "healthy";
    return {
      id: item.id,
      healthStatus: healthStatus as "error" | "redirect" | "healthy",
      httpStatus: response.status,
      finalUrl,
      lastError: response.status >= 400 ? `HTTP ${response.status}` : null,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      id: item.id,
      healthStatus: "error" as const,
      httpStatus: null,
      finalUrl: null,
      lastError: error instanceof Error ? error.message.slice(0, 220) : "Falha ao verificar.",
      latencyMs: Date.now() - started,
    };
  }
}

export async function POST(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const ids: string[] = [];
    if (Array.isArray(body.ids)) {
      for (const value of body.ids as unknown[]) {
        const id = String(value).trim();
        if (id && !ids.includes(id)) ids.push(id);
      }
    }
    if (!ids.length) {
      return NextResponse.json({ error: "Informe ao menos um link para verificar." }, { status: 400 });
    }
    if (ids.length > 50) {
      return NextResponse.json({ error: "Verifique no máximo 50 links por lote." }, { status: 400 });
    }
    const items: AffiliateLink[] = await getAffiliateLinksByIds(ids);

    const results: Array<Awaited<ReturnType<typeof checkDestination>>> = [];
    for (let i = 0; i < items.length; i += 6) {
      const chunk = items.slice(i, i + 6);
      results.push(...(await Promise.all(chunk.map(checkDestination))));
    }

    const updated = [];
    for (const result of results) {
      const item = await updateAffiliateHealth(result.id, {
        healthStatus: result.healthStatus,
        httpStatus: result.httpStatus,
        finalUrl: result.finalUrl,
        lastError: result.lastError,
      });
      if (item) updated.push({ ...item, check_latency_ms: results.find((r) => r.id === item.id)?.latencyMs || null });
    }

    return NextResponse.json({ checked: results.length, data: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro na verificação." }, { status: 500 });
  }
}
