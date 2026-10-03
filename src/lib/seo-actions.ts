import { createHash } from "node:crypto";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export type SeoActionStatus = "open" | "in_progress" | "done" | "dismissed";

export type SeoActionInput = {
  fingerprint?: string;
  type: string;
  priority: "Alta" | "Média";
  title: string;
  detail: string;
  evidence: string;
  action: string;
  source: string;
  href: string;
  impressions: number;
  brief: {
    objective: string;
    contentAction: string;
    suggestedTitle: string;
    validation: string;
  };
};

export type SeoActionRecord = SeoActionInput & {
  id: string;
  fingerprint: string;
  signal_type: string;
  status: SeoActionStatus;
  notes: string;
  first_seen_at: string;
  last_seen_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function createSeoActionFingerprint(action: Pick<SeoActionInput, "type" | "detail" | "href">): string {
  return createHash("sha256")
    .update([action.type, action.detail, action.href].join("|"), "utf8")
    .digest("hex");
}

function toRecord(row: Record<string, unknown>): SeoActionRecord {
  return {
    id: String(row.id),
    fingerprint: String(row.fingerprint),
    signal_type: String(row.signal_type),
    type: String(row.signal_type),
    priority: row.priority === "Alta" ? "Alta" : "Média",
    title: String(row.title),
    detail: String(row.detail),
    evidence: String(row.evidence),
    action: String(row.action),
    source: String(row.source),
    href: String(row.href || ""),
    impressions: Number(row.impressions || 0),
    brief: (row.brief || {}) as SeoActionRecord["brief"],
    status: String(row.status || "open") as SeoActionStatus,
    notes: String(row.notes || ""),
    first_seen_at: String(row.first_seen_at),
    last_seen_at: String(row.last_seen_at),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function syncSeoActions(actions: SeoActionInput[]): Promise<SeoActionRecord[]> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase || !actions.length) return [];

  const now = new Date().toISOString();
  const normalized = actions.map((action) => ({
    ...action,
    fingerprint: action.fingerprint || createSeoActionFingerprint(action),
  }));
  const fingerprints = normalized.map((action) => action.fingerprint);
  const { data: existing, error: existingError } = await supabase
    .from("seo_action_history")
    .select("*")
    .in("fingerprint", fingerprints);

  if (existingError) throw existingError;

  const existingMap = new Map(
    (existing || []).map((row) => [String(row.fingerprint), row as Record<string, unknown>])
  );

  const rows = normalized.map((action) => {
    const old = existingMap.get(action.fingerprint);
    const oldStatus = String(old?.status || "open") as SeoActionStatus;
    return {
      fingerprint: action.fingerprint,
      signal_type: action.type,
      priority: action.priority,
      title: action.title,
      detail: action.detail,
      evidence: action.evidence,
      action: action.action,
      source: action.source,
      href: action.href,
      impressions: Math.max(0, Math.round(action.impressions || 0)),
      brief: action.brief,
      status: oldStatus,
      notes: String(old?.notes || ""),
      first_seen_at: String(old?.first_seen_at || now),
      last_seen_at: now,
      completed_at: old?.completed_at || null,
      updated_at: now,
    };
  });

  const { data, error } = await supabase
    .from("seo_action_history")
    .upsert(rows, { onConflict: "fingerprint" })
    .select("*");

  if (error) throw error;
  return (data || []).map((row) => toRecord(row as Record<string, unknown>));
}

export async function listSeoActions(limit = 50): Promise<SeoActionRecord[]> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("seo_action_history")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw error;
  return (data || []).map((row) => toRecord(row as Record<string, unknown>));
}

export async function updateSeoActionStatus(
  id: string,
  status: SeoActionStatus
): Promise<SeoActionRecord | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;
  const now = new Date().toISOString();
  const patch = {
    status,
    completed_at: status === "done" ? now : null,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("seo_action_history")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as Record<string, unknown>) : null;
}
