import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  listSeoActions,
  syncSeoActions,
  updateSeoActionStatus,
  updateSeoActionImpact,
  markMissingSeoActionsResolved,
  type SeoActionInput,
  type SeoActionStatus,
  type SeoActionRecord,
} from "@/lib/seo-actions";
import { fetchSearchConsoleRowsForRange } from "@/lib/search-console";

export const dynamic = "force-dynamic";

const statuses: SeoActionStatus[] = ["open", "in_progress", "done", "dismissed"];

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInclusive(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000) + 1);
}

function normalizePage(value: string): string {
  try {
    const absolute = new URL(value, process.env.GSC_SITE_URL || "https://vetor.blog");
    absolute.hash = "";
    absolute.search = "";
    absolute.pathname = absolute.pathname.replace(/\/+$/, "") || "/";
    return absolute.toString().toLowerCase();
  } catch {
    return value.trim().replace(/\/+$/, "").toLowerCase();
  }
}

function summarizeRows(
  rows: Array<{ keys?: string[]; impressions?: number; clicks?: number; position?: number }>,
  item: SeoActionRecord
) {
  const targetPage = normalizePage(item.href);
  const targetQuery = item.detail.trim().toLowerCase();
  let impressions = 0;
  let clicks = 0;
  let positionWeighted = 0;

  for (const row of rows) {
    const page = normalizePage(row.keys?.[1] || "");
    const query = (row.keys?.[0] || "").trim().toLowerCase();
    if (page !== targetPage) continue;
    if (item.signal_type !== "POSIÇÃO" && query !== targetQuery) continue;

    const rowImpressions = row.impressions || 0;
    impressions += rowImpressions;
    clicks += row.clicks || 0;
    positionWeighted += (row.position || 0) * rowImpressions;
  }

  return {
    impressions,
    clicks,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? positionWeighted / impressions : 0,
  };
}

async function measureActionImpact(item: SeoActionRecord) {
  if (item.status !== "done" || !item.completed_at) {
    return { item, status: "waiting" as const };
  }

  const completedAt = new Date(item.completed_at);
  if (Number.isNaN(completedAt.getTime())) {
    const updated = await updateSeoActionImpact(item.id, {
      beforeImpressions: null,
      afterImpressions: null,
      beforeClicks: null,
      afterClicks: null,
      beforeCtr: null,
      afterCtr: null,
      beforePosition: null,
      afterPosition: null,
      impactStatus: "no_data",
      impactPeriodDays: null,
    });
    return { item: updated || item, status: "no_data" as const };
  }

  const availableEnd = shiftDate(new Date(), -2);
  const afterStart = shiftDate(completedAt, 3);
  const availableDays = daysInclusive(afterStart, availableEnd);

  if (availableDays < 7) {
    const updated = await updateSeoActionImpact(item.id, {
      beforeImpressions: null,
      afterImpressions: null,
      beforeClicks: null,
      afterClicks: null,
      beforeCtr: null,
      afterCtr: null,
      beforePosition: null,
      afterPosition: null,
      impactStatus: "waiting",
      impactPeriodDays: null,
    });
    return { item: updated || item, status: "waiting" as const };
  }

  const periodDays = Math.min(28, availableDays);
  const afterEnd = shiftDate(afterStart, periodDays - 1);
  const beforeEnd = shiftDate(completedAt, -3);
  const beforeStart = shiftDate(beforeEnd, -(periodDays - 1));

  const ranges = await Promise.all([
    fetchSearchConsoleRowsForRange(formatDate(beforeStart), formatDate(beforeEnd)),
    fetchSearchConsoleRowsForRange(formatDate(afterStart), formatDate(afterEnd)),
  ]);

  if (ranges.some((range) => !range.configured || range.error)) {
    return { item, status: "no_data" as const };
  }

  const before = summarizeRows(ranges[0].rows, item);
  const after = summarizeRows(ranges[1].rows, item);
  const hasAnyData = before.impressions > 0 || after.impressions > 0;

  const updated = await updateSeoActionImpact(item.id, {
    beforeImpressions: before.impressions,
    afterImpressions: after.impressions,
    beforeClicks: before.clicks,
    afterClicks: after.clicks,
    beforeCtr: before.ctr * 100,
    afterCtr: after.ctr * 100,
    beforePosition: before.position || null,
    afterPosition: after.position || null,
    impactStatus: hasAnyData ? "measured" : "no_data",
    impactPeriodDays: periodDays,
  });

  return {
    item: updated || item,
    status: hasAnyData ? ("measured" as const) : ("no_data" as const),
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listSeoActions();
    return NextResponse.json({ history: items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar histórico." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body.actions)) {
      return NextResponse.json({ error: "actions must be an array" }, { status: 400 });
    }

    const actions: SeoActionInput[] = body.actions.slice(0, 50).map((item: SeoActionInput) => ({
      fingerprint: typeof item.fingerprint === "string" ? item.fingerprint : undefined,
      type: String(item.type || ""),
      priority: item.priority === "Alta" ? "Alta" : "Média",
      title: String(item.title || ""),
      detail: String(item.detail || ""),
      evidence: String(item.evidence || ""),
      action: String(item.action || ""),
      source: String(item.source || ""),
      href: String(item.href || ""),
      impressions: Number.isFinite(Number(item.impressions)) ? Number(item.impressions) : 0,
      brief: {
        objective: String(item.brief?.objective || ""),
        contentAction: String(item.brief?.contentAction || ""),
        suggestedTitle: String(item.brief?.suggestedTitle || ""),
        validation: String(item.brief?.validation || ""),
      },
    })).filter((item: SeoActionInput) => item.type && item.title && item.detail);

    const synced = await syncSeoActions(actions);
    const resolved = await markMissingSeoActionsResolved(actions.map((action) => action.fingerprint || ""));
    const history = await listSeoActions();
    return NextResponse.json({ synced: synced.length, history });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar histórico." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listSeoActions(100);
    const completed = items
      .filter((item) => item.status === "done" && item.completed_at)
      .slice(0, 25);
    const results = await Promise.all(completed.map(measureActionImpact));
    const history = await listSeoActions(100);

    return NextResponse.json({
      measured: results.filter((result) => result.status === "measured").length,
      waiting: results.filter((result) => result.status === "waiting").length,
      noData: results.filter((result) => result.status === "no_data").length,
      history,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao medir impacto SEO." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status as SeoActionStatus;
    if (!id || !statuses.includes(status)) {
      return NextResponse.json({ error: "id e status válidos são obrigatórios." }, { status: 400 });
    }

    const item = await updateSeoActionStatus(id, status);
    if (!item) {
      return NextResponse.json({ error: "Ação não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar ação." },
      { status: 500 }
    );
  }
}
