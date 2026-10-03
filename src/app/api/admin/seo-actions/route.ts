import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  listSeoActions,
  syncSeoActions,
  updateSeoActionStatus,
  type SeoActionInput,
  type SeoActionStatus,
} from "@/lib/seo-actions";

export const dynamic = "force-dynamic";

const statuses: SeoActionStatus[] = ["open", "in_progress", "done", "dismissed"];

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
    })).filter((item) => item.type && item.title && item.detail);

    const synced = await syncSeoActions(actions);
    const history = await listSeoActions();
    return NextResponse.json({ synced: synced.length, history });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar histórico." },
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
