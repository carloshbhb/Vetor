import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export type AffiliateLinkStatus = "active" | "paused" | "broken" | "archived";
export type AffiliateSourceType = "review" | "comparison_product" | "product_link" | "manual";
export type AffiliateHealthStatus = "unknown" | "healthy" | "redirect" | "error";

export interface AffiliateLink {
  id: string;
  slug: string;
  name: string;
  marketplace: string;
  category: string;
  source_type: AffiliateSourceType;
  source_ref: string;
  destination_url: string;
  status: AffiliateLinkStatus;
  priority: number;
  notes: string;
  tags: string[];
  health_status: AffiliateHealthStatus;
  last_checked_at: string | null;
  http_status: number | null;
  final_url: string | null;
  last_error: string | null;
  total_clicks: number;
  last_clicked_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_VALUES: AffiliateLinkStatus[] = ["active", "paused", "broken", "archived"];
const SOURCE_VALUES: AffiliateSourceType[] = ["review", "comparison_product", "product_link", "manual"];

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((v) => v.trim()).filter(Boolean);
    } catch {}
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function normalizeRow(row: Record<string, unknown>): AffiliateLink {
  return {
    id: String(row.id),
    slug: String(row.slug || ""),
    name: String(row.name || ""),
    marketplace: String(row.marketplace || "Outro"),
    category: String(row.category || ""),
    source_type: SOURCE_VALUES.includes(row.source_type as AffiliateSourceType)
      ? (row.source_type as AffiliateSourceType)
      : "manual",
    source_ref: String(row.source_ref || ""),
    destination_url: String(row.destination_url || ""),
    status: STATUS_VALUES.includes(row.status as AffiliateLinkStatus)
      ? (row.status as AffiliateLinkStatus)
      : "active",
    priority: Number(row.priority || 0),
    notes: String(row.notes || ""),
    tags: normalizeTags(row.tags),
    health_status: ["unknown", "healthy", "redirect", "error"].includes(String(row.health_status))
      ? (row.health_status as AffiliateHealthStatus)
      : "unknown",
    last_checked_at: row.last_checked_at ? String(row.last_checked_at) : null,
    http_status: row.http_status == null ? null : Number(row.http_status),
    final_url: row.final_url ? String(row.final_url) : null,
    last_error: row.last_error ? String(row.last_error) : null,
    total_clicks: Number(row.total_clicks || 0),
    last_clicked_at: row.last_clicked_at ? String(row.last_clicked_at) : null,
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

export function slugifyAffiliateName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function validateAffiliateDestination(value: string): string {
  const raw = value.trim();
  if (!/^https:\/\//i.test(raw)) throw new Error("O destino precisa usar HTTPS.");
  const url = new URL(raw);
  url.hash = "";
  return url.toString();
}

export async function getAffiliateLinkById(id: string): Promise<AffiliateLink | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("affiliate_links").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function getAffiliateLinkBySlug(slug: string): Promise<AffiliateLink | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("affiliate_links").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function listAffiliateLinks(filters?: {
  search?: string;
  status?: AffiliateLinkStatus;
  marketplace?: string;
  source_type?: AffiliateSourceType;
  health_status?: AffiliateHealthStatus;
  limit?: number;
  offset?: number;
}): Promise<AffiliateLink[]> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return [];
  let query = supabase
    .from("affiliate_links")
    .select("*")
    .order("status", { ascending: true })
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.marketplace) query = query.eq("marketplace", filters.marketplace);
  if (filters?.source_type) query = query.eq("source_type", filters.source_type);
  if (filters?.health_status) query = query.eq("health_status", filters.health_status);
  if (filters?.search) {
    const term = filters.search.replace(/[%_,]/g, " ").trim();
    if (term) {
      query = query.or(
        "name.ilike.%" + term + "%,slug.ilike.%" + term + "%,category.ilike.%" + term + "%,source_ref.ilike.%" + term + "%,notes.ilike.%" + term + "%"
      );
    }
  }

  const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 200);
  const offset = Math.max(filters?.offset ?? 0, 0);
  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error || !data) return [];
  return data.map((row) => normalizeRow(row as Record<string, unknown>));
}

export async function getAffiliateLinkStats() {
  const supabase = getSupabaseServiceKeyClient();
  const empty = {
    total: 0,
    active: 0,
    paused: 0,
    broken: 0,
    archived: 0,
    unchecked: 0,
    clicks: 0,
  };
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from("affiliate_links")
    .select("status,health_status,total_clicks");
  if (error || !data) return empty;

  return data.reduce((stats, row) => {
    stats.total += 1;
    if (row.status === "active") stats.active += 1;
    if (row.status === "paused") stats.paused += 1;
    if (row.status === "broken") stats.broken += 1;
    if (row.status === "archived") stats.archived += 1;
    if (row.health_status === "unknown") stats.unchecked += 1;
    stats.clicks += Number(row.total_clicks || 0);
    return stats;
  }, empty);
}

export async function syncPublishedReviewAffiliateLinks(): Promise<number> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return 0;

  const [{ data: reviews, error: reviewsError }, { data: existing, error: existingError }] = await Promise.all([
    supabase
      .from("reviews")
      .select("slug,product,category,marketplace,affiliate_url")
      .eq("status", "published")
      .not("affiliate_url", "is", null),
    supabase.from("affiliate_links").select("slug"),
  ]);

  if (reviewsError || existingError || !reviews) return 0;

  const existingSlugs = new Set((existing || []).map((row) => String(row.slug)));
  const rows: Array<Record<string, unknown>> = [];
  for (const review of reviews) {
    const slug = String(review.slug || "").trim();
    const destination = String(review.affiliate_url || "").trim();
    if (!slug || !destination || existingSlugs.has(slug)) continue;

    try {
      rows.push({
        slug,
        name: String(review.product || slug),
        marketplace: String(review.marketplace || "Outro"),
        category: String(review.category || ""),
        source_type: "review",
        source_ref: slug,
        destination_url: validateAffiliateDestination(destination),
        status: "active",
        priority: 100,
        notes: "Criado automaticamente a partir de um review publicado.",
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Um review com URL inválida não deve interromper a sincronização dos demais.
    }
  }

  if (!rows.length) return 0;
  const { error } = await supabase.from("affiliate_links").insert(rows);
  if (error) return 0;
  return rows.length;
}

export async function createAffiliateLink(input: {
  slug: string;
  name: string;
  marketplace: string;
  category: string;
  source_type: AffiliateSourceType;
  source_ref: string;
  destination_url: string;
  status: AffiliateLinkStatus;
  priority: number;
  notes: string;
  tags: string[];
}) {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { data: null, error: "Supabase não configurado." };

  const slug = slugifyAffiliateName(input.slug);
  if (!slug) return { data: null, error: "Slug obrigatório." };
  let destination_url: string;
  try { destination_url = validateAffiliateDestination(input.destination_url); }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "Destino inválido." }; }

  const now = new Date().toISOString();
  const { data, error } = await supabase.from("affiliate_links").insert({
    slug,
    name: input.name.trim(),
    marketplace: input.marketplace.trim() || "Outro",
    category: input.category.trim(),
    source_type: input.source_type,
    source_ref: input.source_ref.trim(),
    destination_url,
    status: input.status,
    priority: Math.round(input.priority || 0),
    notes: input.notes.trim(),
    tags: input.tags,
    created_at: now,
    updated_at: now,
  }).select("*").single();

  if (error) return { data: null, error: error.message };
  return { data: normalizeRow(data as Record<string, unknown>), error: null };
}

export async function updateAffiliateLink(id: string, input: Partial<{
  slug: string;
  name: string;
  marketplace: string;
  category: string;
  source_type: AffiliateSourceType;
  source_ref: string;
  destination_url: string;
  status: AffiliateLinkStatus;
  priority: number;
  notes: string;
  tags: string[];
}>) {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { data: null, error: "Supabase não configurado." };

  const patch: Record<string, unknown> = {};
  if (input.slug !== undefined) patch.slug = slugifyAffiliateName(input.slug);
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.marketplace !== undefined) patch.marketplace = input.marketplace.trim() || "Outro";
  if (input.category !== undefined) patch.category = input.category.trim();
  if (input.source_type !== undefined) patch.source_type = input.source_type;
  if (input.source_ref !== undefined) patch.source_ref = input.source_ref.trim();
  if (input.destination_url !== undefined) {
    try { patch.destination_url = validateAffiliateDestination(input.destination_url); }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "Destino inválido." }; }
    patch.health_status = "unknown";
    patch.last_checked_at = null;
    patch.http_status = null;
    patch.final_url = null;
    patch.last_error = null;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.priority !== undefined) patch.priority = Math.round(input.priority);
  if (input.notes !== undefined) patch.notes = input.notes.trim();
  if (input.tags !== undefined) patch.tags = input.tags;
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("affiliate_links").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Link não encontrado." };
  return { data: normalizeRow(data as Record<string, unknown>), error: null };
}

export async function archiveAffiliateLink(id: string) {
  return updateAffiliateLink(id, { status: "archived" });
}

export async function updateAffiliateHealth(id: string, input: {
  healthStatus: AffiliateHealthStatus;
  httpStatus: number | null;
  finalUrl: string | null;
  lastError: string | null;
}) {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("affiliate_links").update({
    health_status: input.healthStatus,
    http_status: input.httpStatus,
    final_url: input.finalUrl,
    last_error: input.lastError,
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").maybeSingle();
  if (error || !data) return null;
  return normalizeRow(data as Record<string, unknown>);
}

export async function recordAffiliateClick(id: string, referrerPath: string | null) {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return;
  try {
    await supabase.from("affiliate_clicks").insert({
      link_id: id,
      referrer_path: referrerPath,
    });
    await supabase.rpc("increment_affiliate_link_click", { p_link_id: id });
  } catch {
    // Métricas nunca devem bloquear o redirecionamento.
  }
}

export async function getAffiliateMarketplaceOptions() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("affiliate_links")
    .select("marketplace")
    .not("marketplace", "is", null);
  if (error || !data) return [];
  return Array.from(new Set(data.map((row) => String(row.marketplace).trim()).filter(Boolean))).sort();
}

export const affiliateStatusValues = STATUS_VALUES;
export const affiliateSourceValues = SOURCE_VALUES;
