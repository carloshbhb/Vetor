import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { isGuideLikeSlug } from "@/lib/buying";

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
  product_url: string;
  affiliate_tag: string;
  affiliate_checked_at: string | null;
  image_url: string;
  price: number | null;
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

type AffiliateLinkFilters = {
  search?: string;
  status?: AffiliateLinkStatus;
  marketplace?: string;
  source_type?: AffiliateSourceType;
  health_status?: AffiliateHealthStatus;
  limit?: number;
  offset?: number;
};

const MARKETPLACE_FILTERS: Record<string, { aliases: string[]; hosts: string[] }> = {
  "Mercado Livre": {
    aliases: ["Mercado Livre", "mercadolivre", "MercadoLivre"],
    hosts: ["mercadolivre.com.br", "mercadolibre.com"],
  },
  Amazon: { aliases: ["Amazon", "amazon"], hosts: ["amazon.", "amzn.to", "amzn.eu"] },
  Shopee: { aliases: ["Shopee", "shopee"], hosts: ["shopee.com"] },
  "Magazine Luiza": { aliases: ["Magazine Luiza", "magazineluiza", "Magalu"], hosts: ["magazineluiza.com.br", "magalu.com"] },
};

function canonicalMarketplace(value: unknown, destinationUrl: unknown): string {
  const raw = String(value || "").trim();
  let hostname = "";
  try {
    hostname = new URL(String(destinationUrl || "")).hostname.toLowerCase().replace(/^www\./, "");
  } catch {}

  if (/mercadolivre\.com\.br|mercadolibre\.com/.test(hostname)) return "Mercado Livre";
  if (/amazon\.|^amzn\.(to|eu)$/.test(hostname)) return "Amazon";
  if (/shopee\.com/.test(hostname)) return "Shopee";
  if (/magazineluiza\.com\.br|magalu\.com/.test(hostname)) return "Magazine Luiza";

  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (["mercadolivre", "mercadolibre"].includes(normalized)) return "Mercado Livre";
  if (normalized === "amazon") return "Amazon";
  if (normalized === "shopee") return "Shopee";
  if (["magazineluiza", "magalu"].includes(normalized)) return "Magazine Luiza";
  return raw || "Outro";
}

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
    marketplace: canonicalMarketplace(row.marketplace, row.destination_url),
    category: String(row.category || ""),
    source_type: SOURCE_VALUES.includes(row.source_type as AffiliateSourceType)
      ? (row.source_type as AffiliateSourceType)
      : "manual",
    source_ref: String(row.source_ref || ""),
    destination_url: String(row.destination_url || ""),
    product_url: String(row.product_url || ""),
    affiliate_tag: String(row.affiliate_tag || ""),
    affiliate_checked_at: row.affiliate_checked_at ? String(row.affiliate_checked_at) : null,
    image_url: String(row.image_url || ""),
    price: row.price == null ? null : Number(row.price),
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

function applyAffiliateLinkFilters(query: any, filters?: AffiliateLinkFilters) {
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.source_type) query = query.eq("source_type", filters.source_type);
  if (filters?.health_status) query = query.eq("health_status", filters.health_status);
  if (filters?.marketplace) {
    const marketplace = canonicalMarketplace(filters.marketplace, "");
    const definition = MARKETPLACE_FILTERS[marketplace];
    if (definition) {
      const clauses = [
        ...definition.aliases.map((alias) => `marketplace.eq."${alias}"`),
        ...definition.hosts.map((host) => `destination_url.ilike.%${host}%`),
      ];
      query = query.or(clauses.join(","));
    } else {
      query = query.eq("marketplace", filters.marketplace);
    }
  }
  if (filters?.search) {
    const term = filters.search.replace(/[%_,()."'\\]/g, " ").trim();
    if (term) {
      query = query.or(
        "name.ilike.%" + term + "%,slug.ilike.%" + term + "%,category.ilike.%" + term + "%,source_ref.ilike.%" + term + "%,notes.ilike.%" + term + "%"
      );
    }
  }
  return query;
}

async function fetchAffiliateLinksPage(filters: AffiliateLinkFilters | undefined, withCount: boolean) {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { data: [] as AffiliateLink[], total: 0 };
  let query = supabase
    .from("affiliate_links")
    .select("*", withCount ? { count: "exact" } : {})
    .order("status", { ascending: true })
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });
  query = applyAffiliateLinkFilters(query, filters);
  const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 200);
  const offset = Math.max(filters?.offset ?? 0, 0);
  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error || !data) return { data: [] as AffiliateLink[], total: 0 };
  return {
    data: data.map((row) => normalizeRow(row as Record<string, unknown>)),
    total: count ?? data.length,
  };
}

export async function listAffiliateLinks(filters?: AffiliateLinkFilters): Promise<AffiliateLink[]> {
  return (await fetchAffiliateLinksPage(filters, false)).data;
}

export async function listAffiliateLinksPage(filters?: AffiliateLinkFilters) {
  return fetchAffiliateLinksPage(filters, true);
}

export async function getAffiliateLinksByIds(ids: string[]): Promise<AffiliateLink[]> {
  const supabase = getSupabaseServiceKeyClient();
  const uniqueIds = Array.from(new Set(ids)).slice(0, 50);
  if (!supabase || !uniqueIds.length) return [];
  const { data, error } = await supabase.from("affiliate_links").select("*").in("id", uniqueIds);
  if (error) throw error;
  return (data || []).map((row) => normalizeRow(row as Record<string, unknown>));
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
    healthErrors: 0,
    clicks: 0,
  };
  if (!supabase) return empty;

  const data: Array<{ status: string; health_status: string; total_clicks: number }> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: page, error } = await supabase
      .from("affiliate_links")
      .select("status,health_status,total_clicks")
      .range(offset, offset + 999);
    if (error || !page) return empty;
    data.push(...page);
    if (page.length < 1000) break;
  }

  return data.reduce((stats, row) => {
    stats.total += 1;
    if (row.status === "active") stats.active += 1;
    if (row.status === "paused") stats.paused += 1;
    if (row.status === "broken") stats.broken += 1;
    if (row.status === "archived") stats.archived += 1;
    if (row.health_status === "unknown") stats.unchecked += 1;
    if (row.health_status === "error") stats.healthErrors += 1;
    stats.clicks += Number(row.total_clicks || 0);
    return stats;
  }, empty);
}

export async function syncPublishedReviewAffiliateLinks(): Promise<number> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return 0;

  const [
    { data: existing, error: existingError },
    { data: reviews, error: reviewsError },
    { data: productLinks, error: productLinksError },
    { data: articles, error: articlesError },
  ] = await Promise.all([
    supabase.from("affiliate_links").select("id,slug,source_type,status"),
    supabase
      .from("reviews")
      .select("slug,product,category,marketplace,affiliate_url")
      .eq("status", "published")
      .not("affiliate_url", "is", null),
    supabase
      .from("product_links")
      .select("id,slug,product_name,category,marketplace,affiliate_url,status,priority,notes,tags,created_at,updated_at"),
    supabase
      .from("viral_articles")
      .select("slug,category,products"),
  ]);

  if (existingError) return 0;

  const existingBySlug = new Map(
    (existing || []).map((row) => [
      String(row.slug),
      {
        id: String(row.id),
        source_type: String(row.source_type || ""),
        status: String(row.status || "active"),
      },
    ])
  );

  const rows: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const queuedUpdateIds = new Set<string>();

  const queueUpdate = (id: string, patch: Record<string, unknown>) => {
    if (!id || queuedUpdateIds.has(id)) return;
    queuedUpdateIds.add(id);
    updates.push({ id, patch });
  };

  const addOrUpdateRow = (row: Record<string, unknown>) => {
    const slug = String(row.slug || "").trim();
    if (!slug) return;
    const existingRow = existingBySlug.get(slug);

    if (!existingRow) {
      existingBySlug.set(slug, {
        id: "",
        source_type: String(row.source_type || ""),
        status: String(row.status || "active"),
      });
      rows.push(row);
      return;
    }

    if (String(row.source_type || "") === "comparison_product" && existingRow.id) {
      queueUpdate(existingRow.id, {
        name: String(row.name || ""),
        marketplace: String(row.marketplace || "Outro"),
        category: String(row.category || ""),
        source_type: "comparison_product",
        source_ref: String(row.source_ref || ""),
        destination_url: String(row.destination_url || ""),
        status: "active",
        priority: Number(row.priority || 0),
        notes: String(row.notes || ""),
        tags: normalizeTags(row.tags),
        health_status: "unknown",
        last_checked_at: null,
        http_status: null,
        final_url: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      });
    }
  };

  if (!reviewsError && reviews) {
    for (const review of reviews) {
      const slug = String(review.slug || "").trim();
      const destination = String(review.affiliate_url || "").trim();
      if (!slug || !destination) continue;

      if (isGuideLikeSlug(slug)) {
        const existingRow = existingBySlug.get(slug);
        if (existingRow?.id && existingRow.source_type === "review" && existingRow.status !== "archived") {
          queueUpdate(existingRow.id, {
            status: "archived",
            notes: "Arquivado automaticamente: guia/lista não é produto individual.",
            updated_at: new Date().toISOString(),
          });
        }
        continue;
      }

      try {
        addOrUpdateRow({
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
        });
      } catch {}
    }
  }

  if (!productLinksError && productLinks) {
    for (const productLink of productLinks) {
      const slug = String(productLink.slug || "").trim();
      const destination = String(productLink.affiliate_url || "").trim();
      if (!slug || !destination) continue;
      try {
        addOrUpdateRow({
          slug,
          name: String(productLink.product_name || slug),
          marketplace: String(productLink.marketplace || "Outro"),
          category: String(productLink.category || ""),
          source_type: "product_link",
          source_ref: "legacy-product-link:" + String(productLink.id || ""),
          destination_url: validateAffiliateDestination(destination),
          status: String(productLink.status || "").toLowerCase() === "archived" ? "archived" : "active",
          priority: Number(productLink.priority || 0),
          notes: "Migrado automaticamente de public.product_links." +
            (String(productLink.notes || "").trim() ? " " + String(productLink.notes).trim() : ""),
          tags: normalizeTags(productLink.tags),
          created_at: productLink.created_at || undefined,
          updated_at: productLink.updated_at || undefined,
        });
      } catch {}
    }
  }

  if (!articlesError && articles) {
    for (const article of articles) {
      const articleSlug = String(article.slug || "").trim();
      const products = Array.isArray(article.products) ? article.products : [];
      if (!articleSlug) continue;

      products.forEach((product: Record<string, unknown>, index: number) => {
        const destination = String(product.product_url || "").trim();
        if (!destination) return;
        const slug = articleSlug + "-p" + String(index + 1);

        try {
          addOrUpdateRow({
            slug,
            name: String(product.name || "Produto " + String(index + 1)),
            marketplace: "Mercado Livre",
            category: String(article.category || ""),
            source_type: "comparison_product",
            source_ref: "comparativo:" + articleSlug + "#" + String(index + 1),
            destination_url: validateAffiliateDestination(destination),
            status: "active",
            priority: 50,
            notes: "Sincronizado automaticamente do comparativo. Edite o destino na Central de Afiliados.",
            tags: ["comparativo"],
          });
        } catch {}
      });
    }
  }

  let changed = 0;
  if (rows.length) {
    const { data, error } = await supabase.from("affiliate_links").insert(rows).select("id");
    if (!error && data) changed += data.length;
  }

  for (const update of updates) {
    const { data, error } = await supabase
      .from("affiliate_links")
      .update(update.patch)
      .eq("id", update.id)
      .select("id")
      .maybeSingle();
    if (!error && data) changed += 1;
  }

  return changed;
}

export async function createAffiliateLink(input: {
  slug: string;
  name: string;
  marketplace: string;
  category: string;
  source_type: AffiliateSourceType;
  source_ref: string;
  destination_url: string;
  product_url: string;
  affiliate_tag: string;
  affiliate_checked_at: string | null;
  image_url: string;
  price: number | null;
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
  if (input.price !== null && (!Number.isFinite(input.price) || input.price < 0)) {
    return { data: null, error: "O preço precisa ser um número igual ou maior que zero." };
  }
  if (input.affiliate_tag.trim().length > 30) return { data: null, error: "A etiqueta da Central aceita até 30 caracteres." };
  let product_url = "";
  let image_url = "";
  try {
    product_url = input.product_url.trim() ? validateAffiliateDestination(input.product_url) : "";
    image_url = input.image_url.trim() ? validateAffiliateDestination(input.image_url) : "";
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "URL de produto inválida." };
  }
  const { data, error } = await supabase.from("affiliate_links").insert({
    slug,
    name: input.name.trim(),
    marketplace: input.marketplace.trim() || "Outro",
    category: input.category.trim(),
    source_type: input.source_type,
    source_ref: input.source_ref.trim(),
    destination_url,
    product_url,
    affiliate_tag: input.affiliate_tag.trim(),
    affiliate_checked_at: input.affiliate_checked_at,
    image_url,
    price: input.price,
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
  product_url: string;
  affiliate_tag: string;
  affiliate_checked_at: string | null;
  image_url: string;
  price: number | null;
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
  if (input.product_url !== undefined) {
    try { patch.product_url = input.product_url.trim() ? validateAffiliateDestination(input.product_url) : ""; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "URL de produto inválida." }; }
  }
  if (input.affiliate_tag !== undefined) {
    if (input.affiliate_tag.trim().length > 30) return { data: null, error: "A etiqueta da Central aceita até 30 caracteres." };
    patch.affiliate_tag = input.affiliate_tag.trim();
  }
  if (input.affiliate_checked_at !== undefined) patch.affiliate_checked_at = input.affiliate_checked_at;
  if (input.image_url !== undefined) {
    try { patch.image_url = input.image_url.trim() ? validateAffiliateDestination(input.image_url) : ""; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "URL de imagem inválida." }; }
  }
  if (input.price !== undefined) {
    if (input.price !== null && (!Number.isFinite(input.price) || input.price < 0)) return { data: null, error: "O preço precisa ser um número igual ou maior que zero." };
    patch.price = input.price;
  }
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
    .select("marketplace,destination_url")
    .not("marketplace", "is", null);
  if (error || !data) return [];
  return Array.from(new Set(data.map((row) => canonicalMarketplace(row.marketplace, row.destination_url)).filter(Boolean))).sort();
}

export const affiliateStatusValues = STATUS_VALUES;
export const affiliateSourceValues = SOURCE_VALUES;
