import type { SupabaseClient } from "@supabase/supabase-js";
import { ML_SOCIAL_LIST_ID, fetchPublicSocialList } from "@/lib/mercadolivre-social-list";
import { slugifyAffiliateName, validateAffiliateDestination } from "@/lib/affiliate-links";
import { generateAffiliateUrl } from "@/lib/product-extractor";

type SocialListSyncResult = {
  ok: boolean;
  saved: number;
  expectedTotal: number | null;
  fetchedTotal: number;
  missingTotal: number | null;
  pagesScanned: number;
  status: "complete" | "partial" | "error";
  message: string;
  dryRun: boolean;
};

type SocialListImportResult = {
  ok: boolean;
  catalogTotal: number;
  alreadyImported: number;
  inserted: number;
  existingTotal: number;
  existingSample: Array<{ source_ref: string | null; product_url: string | null; slug: string | null }>;
  dryRun: boolean;
};

type SeoBoostResult = {
  ok: boolean;
  keywords: number;
  links: number;
  boosted: number;
  skipped?: string;
  topMatches: Array<{ name: string; keyword: string; score: number }>;
  dryRun: boolean;
};

type PromotionResult = {
  ok: boolean;
  considered: number;
  promoted: number;
  skippedExisting: number;
  skippedUnsafe: number;
  skippedAccessory: number;
  duplicateMatches: number;
  errors: number;
  candidates: Array<{ name: string; matchedTitle: string | null; score: number | null }>;
  accessoryCandidates: Array<{ name: string; matchedTitle: string | null; score: number | null }>;
  dryRun: boolean;
};

type CleanupResult = {
  ok: boolean;
  found: number;
  archived: number;
  items: Array<{ slug: string; product: string; landingPageSlug: string }>;
  dryRun: boolean;
};

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function appendNote(current: unknown, addition: string): string {
  const base = String(current || "").trim();
  if (base.includes(addition)) return base;
  return base ? `${base} ${addition}` : addition;
}

function uniqueTags(current: unknown, additions: string[]): string[] {
  const tags = Array.isArray(current) ? current.map((tag) => String(tag)).filter(Boolean) : [];
  for (const tag of additions) if (tag && !tags.includes(tag)) tags.push(tag);
  return tags;
}

// The production affiliate_links check constraint only allows review,
// comparison_product, product_link and manual. The public social list is
// therefore imported as product_link and identified by this source_ref prefix.
// Promotion converts the row to comparison_product, which is the source_type
// the daily review discovery accepts.
export const SOCIAL_LIST_SOURCE_REF_PREFIX = "ml_social_list:";
export const SOCIAL_LIST_IMPORT_SOURCE_TYPE = "product_link";

/** True for rows created by importSocialList, including legacy social_list rows. */
export function isSocialListSourceRef(value: unknown): boolean {
  return String(value || "").trim().startsWith(SOCIAL_LIST_SOURCE_REF_PREFIX);
}

export type DeadlineGuard = {
  deadlineAt: number;
  isExpired: (at?: number) => boolean;
  remainingMs: (at?: number) => number;
};

/**
 * Time budget for the matching loop. The matching batch is the slowest step and
 * runs against a rate-limited public API, so it must stop before the CI job
 * timeout. Whatever was matched still reaches promotion and cleanup, and the
 * remaining candidates are picked up by the next refill.
 */
export function createDeadlineGuard(minutes: number, now = Date.now()): DeadlineGuard {
  const safeMinutes = Math.min(Math.max(Number(minutes) || 0, 1), 120);
  const deadlineAt = now + safeMinutes * 60_000;
  return {
    deadlineAt,
    isExpired: (at = Date.now()) => at >= deadlineAt,
    remainingMs: (at = Date.now()) => Math.max(0, deadlineAt - at),
  };
}

function isPromotableSource(sourceType: string, sourceRef: unknown): boolean {
  if (sourceType === "comparison_product") return true;
  // Accept the dedicated type if the database constraint is relaxed later.
  if (sourceType === "social_list") return true;
  return sourceType === SOCIAL_LIST_IMPORT_SOURCE_TYPE && isSocialListSourceRef(sourceRef);
}

// Accessory terms are almost never the product itself unless the source name
// already declares that type. Blocking them prevents a laptop from being linked
// to a mouse, a watch to a strap, or a robot vacuum to a replacement filter.
const ACCESSORY_TERMS = [
  "pulseira", "bracelete", "correia", "carregador", "carregamento", "cabo",
  "conector", "adaptador", "fonte", "cesta", "botao", "peca", "reposicao",
  "capa", "pelicula", "protetor", "bolsa", "mochila", "pasta", "pedestal",
  "base para", "vidro", "filme", "refil", "filtro", "escova", "mop",
  "reservatorio", "saco", "transmissor", "transmitter", "receptor", "receiver",
  "sensor anti-queda", "sensor antiqueda", "anti-queda", "antiqueda",
  "compativel", "compatible", "dlveer",
];

const ACCESSORY_TYPE_TERMS = ["mouse", "teclado", "controle", "gamepad", "joystick"];
const REPLACEMENT_SCREEN_PATTERNS = [
  /tela\s+(?:display|touch|lcd|oled|amoled)/,
  /display\s+(?:touch|lcd|oled|amoled)/,
  /tela\s+(?:de|para)\s/,
];

function normalizeMatchText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the matched ML item looks like an accessory for the source product. */
export function isAccessoryMatch(sourceName: string, matchedTitle: string): boolean {
  const source = normalizeMatchText(sourceName);
  const matched = normalizeMatchText(matchedTitle);
  if (!source || !matched) return false;

  const sourceHasAccessoryTerm = ACCESSORY_TERMS.some((term) => source.includes(term));
  if (!sourceHasAccessoryTerm && ACCESSORY_TERMS.some((term) => matched.includes(term))) {
    return true;
  }
  if (!sourceHasAccessoryTerm && REPLACEMENT_SCREEN_PATTERNS.some((pattern) => pattern.test(matched))) {
    return true;
  }

  const hasCompatibilitySignal = /(?:^|\s)(?:para|p\/)\s/.test(matched) ||
    matched.includes("compativel") ||
    matched.includes("compatible");
  if (hasCompatibilitySignal) {
    const sourceHasType = ACCESSORY_TYPE_TERMS.some((term) => source.includes(term));
    const matchedHasOtherType = ACCESSORY_TYPE_TERMS.some((term) => matched.includes(term) && !source.includes(term));
    if (!sourceHasType && matchedHasOtherType) return true;
  }

  return false;
}

/**
 * Pulls the public Mercado Livre social list into ml_social_list_items.
 * Non-fatal on fetch failure: the caller can still import from the existing
 * catalog and run the matching batch.
 */
export async function syncSocialList(
  supabase: SupabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<SocialListSyncResult> {
  const dryRun = Boolean(options.dryRun);
  let syncId: string | null = null;

  if (!dryRun) {
    const { data: sync, error } = await supabase
      .from("ml_social_list_syncs")
      .insert({ list_id: ML_SOCIAL_LIST_ID, status: "running" })
      .select("id")
      .single();
    if (error || !sync) {
      throw new Error("Não foi possível iniciar a sincronização da Lista Social: " + (error?.message || "registro não retornado"));
    }
    syncId = String(sync.id);
  }

  try {
    const result = await fetchPublicSocialList();
    if (!result.items.length) throw new Error("A página pública não retornou produtos.");

    let saved = 0;
    if (dryRun) {
      saved = result.items.length;
    } else {
      for (let offset = 0; offset < result.items.length; offset += 50) {
        const batch = result.items.slice(offset, offset + 50);
        const { data, error } = await supabase
          .from("ml_social_list_items")
          .upsert(batch, { onConflict: "list_id,item_id" })
          .select("item_id");
        if (error) {
          throw new Error("Falha ao gravar lote " + (Math.floor(offset / 50) + 1) + ": " + error.message);
        }
        saved += data?.length || batch.length;
      }
    }

    const missingTotal = result.expectedTotal == null
      ? null
      : Math.max(0, result.expectedTotal - result.items.length);
    const status: "complete" | "partial" = missingTotal == null || missingTotal > 0 ? "partial" : "complete";
    const summary = {
      expected_total: result.expectedTotal,
      fetched_total: result.items.length,
      unique_total: result.items.length,
      missing_total: missingTotal,
      pages_scanned: result.pagesScanned,
      status,
      error_message: missingTotal == null
        ? "O contador total não foi localizado na página pública."
        : (missingTotal > 0 ? "A página pública não expôs todos os produtos declarados no contador." : null),
      finished_at: new Date().toISOString(),
    };

    if (!dryRun && syncId) {
      const { error: updateError } = await supabase
        .from("ml_social_list_syncs")
        .update(summary)
        .eq("id", syncId);
      if (updateError) {
        throw new Error("Produtos gravados, mas não foi possível finalizar o histórico: " + updateError.message);
      }
    }

    return {
      ok: true,
      saved,
      expectedTotal: result.expectedTotal,
      fetchedTotal: result.items.length,
      missingTotal,
      pagesScanned: result.pagesScanned,
      status,
      message: missingTotal == null
        ? "Sincronização parcial: o contador total da página não pôde ser validado."
        : (missingTotal > 0
          ? "Sincronização parcial: o Mercado Livre informa " + result.expectedTotal + " resultados, mas a página expôs " + result.items.length + " produtos únicos."
          : "Lista pública sincronizada."),
      dryRun,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar.";
    if (!dryRun && syncId) {
      await supabase
        .from("ml_social_list_syncs")
        .update({ status: "error", error_message: message, finished_at: new Date().toISOString() })
        .eq("id", syncId);
    }
    throw error;
  }
}

/** Imports the social-list catalog into the affiliate research queue. */
export async function importSocialList(
  supabase: SupabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<SocialListImportResult> {
  const dryRun = Boolean(options.dryRun);
  const { data: products, error: productsError } = await supabase
    .from("ml_social_list_items")
    .select("item_id,title,product_url,image_url,price")
    .eq("list_id", ML_SOCIAL_LIST_ID)
    .order("title", { ascending: true })
    .limit(1000);

  if (productsError) throw new Error(productsError.message);
  if (!products?.length) throw new Error("A lista ainda não foi sincronizada.");

  const { data: existing, error: existingError } = await supabase
    .from("affiliate_links")
    .select("id,source_ref,product_url,slug")
    .like("source_ref", SOCIAL_LIST_SOURCE_REF_PREFIX + "%")
    .limit(2000);

  if (existingError) throw new Error(existingError.message);

  const normalizeUrl = (value: unknown): string => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      url.search = "";
      url.hash = "";
      return url.toString().replace(/\/+$/, "").toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  };
  const normalizeItemId = (value: unknown): string => {
    const match = String(value || "").match(/MLB-?(\d+)/i);
    return match ? "MLB" + match[1] : "";
  };

  const existingRefs = new Set<string>();
  const existingItemIds = new Set<string>();
  const existingUrls = new Set<string>();
  for (const row of existing || []) {
    const ref = String(row.source_ref || "").trim();
    if (ref) {
      existingRefs.add(ref);
      const refTail = ref.split(":").pop() || "";
      const refId = normalizeItemId(refTail) || normalizeItemId(ref);
      if (refId) existingItemIds.add(refId);
    }
    const url = normalizeUrl(row.product_url);
    if (url) existingUrls.add(url);
    const slugId = normalizeItemId(row.slug);
    if (slugId) existingItemIds.add(slugId);
    const urlId = normalizeItemId(row.product_url);
    if (urlId) existingItemIds.add(urlId);
  }

  const isAlreadyImported = (item: (typeof products)[number]): boolean => {
    const fullRef = SOCIAL_LIST_SOURCE_REF_PREFIX + ML_SOCIAL_LIST_ID + ":" + item.item_id;
    if (existingRefs.has(fullRef)) return true;
    const itemId = normalizeItemId(item.item_id);
    if (itemId && existingItemIds.has(itemId)) return true;
    const url = normalizeUrl(item.product_url);
    if (url && existingUrls.has(url)) return true;
    return false;
  };

  const toInsert = products
    .filter((item) => !isAlreadyImported(item))
    .map((item) => ({
      slug: "ml-lista-" + slugifyAffiliateName(item.title) + "-" + item.item_id.toLowerCase(),
      name: item.title,
      marketplace: "Mercado Livre",
      category: "Lista social",
      source_type: SOCIAL_LIST_IMPORT_SOURCE_TYPE,
      source_ref: SOCIAL_LIST_SOURCE_REF_PREFIX + ML_SOCIAL_LIST_ID + ":" + item.item_id,
      destination_url: "",
      product_url: item.product_url,
      status: "active",
      priority: 50,
      notes: "Importado da lista pública Minhas recomendações do perfil Vetor Blog. Link de afiliado ainda não gerado.",
      tags: ["lista-social", "mercado-livre"],
      health_status: "unknown",
      image_url: item.image_url || "",
      price: item.price,
      affiliate_tag: "",
    }));

  let inserted = 0;
  if (!dryRun) {
    for (let offset = 0; offset < toInsert.length; offset += 50) {
      const { data, error } = await supabase
        .from("affiliate_links")
        .insert(toInsert.slice(offset, offset + 50))
        .select("id");
      if (error) {
        throw new Error("Importação interrompida após " + inserted + " produtos: " + error.message);
      }
      inserted += data?.length || 0;
    }
  }

  return {
    ok: true,
    catalogTotal: products.length,
    alreadyImported: products.length - toInsert.length,
    inserted: dryRun ? toInsert.length : inserted,
    existingTotal: existing?.length || 0,
    existingSample: (existing || []).slice(0, 5).map((row) => ({
      source_ref: row.source_ref == null ? null : String(row.source_ref),
      product_url: row.product_url == null ? null : String(row.product_url),
      slug: row.slug == null ? null : String(row.slug),
    })),
    dryRun,
  };
}

const SEO_STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos",
  "para", "por", "com", "sem", "que", "qual", "quais", "como", "onde", "quando", "melhor", "melhores",
  "top", "guia", "review", "reviews", "comparativo", "comparativos", "preco", "preços", "precos", "barato",
  "barata", "comprar", "vale", "pena", "escolher", "escolha", "atual", "atualizado", "2024", "2025", "2026",
]);

const SEO_SYNONYMS: Record<string, string> = {
  celular: "smartphone",
  celulares: "smartphone",
  telefone: "smartphone",
  smartphone: "smartphone",
  fone: "headphone",
  fones: "headphone",
  headphone: "headphone",
  headset: "headphone",
  auricular: "headphone",
  notebook: "notebook",
  laptops: "notebook",
  computador: "notebook",
  tv: "televisao",
  televisao: "televisao",
  geladeira: "refrigerador",
  refrigerador: "refrigerador",
  aspirador: "aspirador",
  robô: "aspirador",
  robo: "aspirador",
  smartwatch: "smartwatch",
  relogio: "smartwatch",
};

function seoTokens(value: string): string[] {
  const raw = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
  return raw
    .filter((token) => token.length >= 3 || /^\d+[a-z]*$/.test(token))
    .map((token) => SEO_SYNONYMS[token] || token)
    .filter((token) => !SEO_STOPWORDS.has(token));
}

/**
 * Connects seo_keywords to the affiliate queue: products that match a
 * high-opportunity keyword get a priority bump before matching and before the
 * daily review discovery turns them into product_links.
 */
export async function boostAffiliatePriorityFromSeo(
  supabase: SupabaseClient,
  options: { dryRun?: boolean; maxBoost?: number } = {}
): Promise<SeoBoostResult> {
  const dryRun = Boolean(options.dryRun);
  const maxBoost = Math.min(Math.max(Number(options.maxBoost || 50), 1), 120);

  const { data: keywords, error: keywordsError } = await supabase
    .from("seo_keywords")
    .select("keyword,opportunity_score,vetor_fit_score")
    .gte("vetor_fit_score", 60)
    .order("opportunity_score", { ascending: false })
    .limit(120);

  if (keywordsError) {
    return {
      ok: false,
      keywords: 0,
      links: 0,
      boosted: 0,
      skipped: keywordsError.message,
      topMatches: [],
      dryRun,
    };
  }

  const { data: links, error: linksError } = await supabase
    .from("affiliate_links")
    .select("id,name,priority,status,source_type,source_ref")
    .neq("status", "archived")
    .in("source_type", [SOCIAL_LIST_IMPORT_SOURCE_TYPE, "social_list", "comparison_product"])
    .limit(1000);

  if (linksError) {
    return {
      ok: false,
      keywords: keywords?.length || 0,
      links: 0,
      boosted: 0,
      skipped: linksError.message,
      topMatches: [],
      dryRun,
    };
  }

  const keywordRows = (keywords || [])
    .map((row) => {
      const tokens = seoTokens(String(row.keyword || ""));
      return {
        keyword: String(row.keyword || ""),
        tokens: new Set(tokens),
        opportunity: Number(row.opportunity_score || 0),
      };
    })
    .filter((row) => row.tokens.size > 0);

  const matches: Array<{ id: string; name: string; keyword: string; score: number; priority: number }> = [];

  for (const link of links || []) {
    // product_link is shared with other features. Only the social-list imports
    // (identified by source_ref) are eligible for the SEO priority boost.
    if (String(link.source_type || "") === SOCIAL_LIST_IMPORT_SOURCE_TYPE && !isSocialListSourceRef(link.source_ref)) {
      continue;
    }
    const nameTokens = new Set(seoTokens(String(link.name || "")));
    if (!nameTokens.size) continue;
    let best: { keyword: string; score: number } | null = null;

    for (const row of keywordRows) {
      const shared = [...row.tokens].filter((token) => nameTokens.has(token));
      const strongEnough = shared.length >= 2 || shared.some((token) => token.length >= 6);
      if (!strongEnough) continue;
      const score = row.opportunity * (shared.length + 1);
      if (!best || score > best.score) best = { keyword: row.keyword, score };
    }

    if (best) {
      matches.push({
        id: String(link.id),
        name: String(link.name || ""),
        keyword: best.keyword,
        score: best.score,
        priority: Number(link.priority || 0),
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const selected = matches.slice(0, maxBoost);
  let boosted = 0;

  for (const match of selected) {
    if (match.priority >= 85) continue;
    if (!dryRun) {
      const { error } = await supabase
        .from("affiliate_links")
        .update({ priority: 85, updated_at: new Date().toISOString() })
        .eq("id", match.id);
      if (error) continue;
    }
    boosted += 1;
  }

  return {
    ok: true,
    keywords: keywordRows.length,
    links: links?.length || 0,
    boosted,
    topMatches: selected.slice(0, 10).map((match) => ({
      name: match.name,
      keyword: match.keyword,
      score: Math.round(match.score),
    })),
    dryRun,
  };
}

/**
 * Promotes high-confidence matches from the social list to the exact shape the
 * daily review discovery accepts: comparison_product + active + HTTPS
 * destination with the Vetor tracking parameters.
 */
export async function promoteMatchedAffiliates(
  supabase: SupabaseClient,
  options: { dryRun?: boolean; limit?: number } = {}
): Promise<PromotionResult> {
  const dryRun = Boolean(options.dryRun);
  const limit = Math.min(Math.max(Number(options.limit || 500), 1), 500);
  const trackingTag = process.env.ML_TRACKING_ID || "carloshbhb";

  const { data, error } = await supabase
    .from("affiliate_link_ml_matches")
    .select("affiliate_link_id,matched_item_id,matched_product_id,matched_title,matched_url,match_score,match_status,affiliate_links!inner(id,name,category,slug,destination_url,product_url,image_url,source_type,source_ref,status,priority,tags,notes,affiliate_tag)")
    .eq("match_status", "matched")
    .gte("match_score", 0.9)
    .order("match_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Falha ao ler os matches do Mercado Livre: " + error.message);

  const rawRows = (data || []) as unknown as Array<
    Record<string, unknown> & {
      affiliate_links?: Record<string, unknown> | Record<string, unknown>[] | null;
    }
  >;
  type MatchRow = Record<string, unknown> & {
    affiliate_links?: Record<string, unknown> | null;
  };
  const rows: MatchRow[] = rawRows.map((row) => ({
    ...row,
    affiliate_links: Array.isArray(row.affiliate_links)
      ? row.affiliate_links[0] || null
      : row.affiliate_links,
  }));
  const result: PromotionResult = {
    ok: true,
    considered: rows.length,
    promoted: 0,
    skippedExisting: 0,
    skippedUnsafe: 0,
    skippedAccessory: 0,
    duplicateMatches: 0,
    errors: 0,
    candidates: [],
    accessoryCandidates: [],
    dryRun,
  };

  // The join can return more than one match row per affiliate link. Rows are
  // ordered by score, so the first appearance is always the best one.
  const seenLinks = new Set<string>();

  for (const row of rows) {
    const source = row.affiliate_links;
    if (!source) {
      result.skippedUnsafe += 1;
      continue;
    }

    const sourceId = String(source.id || row.affiliate_link_id || "").trim();
    if (sourceId && seenLinks.has(sourceId)) {
      result.duplicateMatches += 1;
      continue;
    }
    if (sourceId) seenLinks.add(sourceId);

    const sourceType = String(source.source_type || "");
    const sourceStatus = String(source.status || "");
    const destination = String(source.destination_url || "").trim();
    const matchedUrl = String(row.matched_url || "").trim();
    const matchedItemId = String(row.matched_item_id || "").trim();
    const score = Number(row.match_score || 0);
    const name = String(source.name || "").trim();
    const matchedTitle = row.matched_title == null ? "" : String(row.matched_title);

    if (sourceStatus === "archived" || !isPromotableSource(sourceType, source.source_ref)) {
      result.skippedUnsafe += 1;
      continue;
    }
    if (isHttpsUrl(destination)) {
      result.skippedExisting += 1;
      continue;
    }
    if (
      !name ||
      !isHttpsUrl(matchedUrl) ||
      !/^MLB-?\d+$/i.test(matchedItemId) ||
      score < 0.9
    ) {
      result.skippedUnsafe += 1;
      continue;
    }
    if (isAccessoryMatch(name, matchedTitle)) {
      result.skippedAccessory += 1;
      if (result.accessoryCandidates.length < 10) {
        result.accessoryCandidates.push({
          name,
          matchedTitle: matchedTitle || null,
          score: Number.isFinite(score) ? score : null,
        });
      }
      continue;
    }

    let trackingUrl: string;
    try {
      trackingUrl = validateAffiliateDestination(generateAffiliateUrl(matchedUrl, "mercadolivre"));
    } catch {
      result.skippedUnsafe += 1;
      continue;
    }

    const productUrl = isHttpsUrl(source.product_url) ? String(source.product_url) : matchedUrl;
    const now = new Date().toISOString();
    const notes = appendNote(
      source.notes,
      "Promovido automaticamente a comparativo com link de afiliado do Mercado Livre em " + now.slice(0, 10) + "."
    );
    const tags = uniqueTags(source.tags, ["auto-promoted", "mercado-livre"]);

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("affiliate_links")
        .update({
          destination_url: trackingUrl,
          product_url: productUrl,
          source_type: "comparison_product",
          status: "active",
          priority: Math.max(Number(source.priority || 0), 60),
          affiliate_tag: trackingTag,
          affiliate_checked_at: now,
          notes,
          tags,
          updated_at: now,
        })
        .eq("id", String(source.id));
      if (updateError) {
        result.errors += 1;
        continue;
      }
    }

    result.promoted += 1;
    result.candidates.push({
      name,
      matchedTitle: row.matched_title == null ? null : String(row.matched_title),
      score: Number.isFinite(score) ? score : null,
    });
  }

  return result;
}

/**
 * Removes the landing-page deadlock: a product_links row whose slug already has
 * an LP is archived so the daily review generator cannot try to create the same
 * slug again. The LP itself is untouched.
 */
export async function archiveLandingPageCoveredProducts(
  supabase: SupabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<CleanupResult> {
  const dryRun = Boolean(options.dryRun);
  const { data, error } = await supabase
    .from("product_links")
    .select("id,slug,product_name,status,has_review,landing_page_slug,notes")
    .eq("has_review", false)
    .not("landing_page_slug", "is", null)
    .neq("status", "archived")
    .limit(200);

  if (error) throw new Error("Falha ao ler produtos cobertos por landing page: " + error.message);

  const rows = (data || []).filter((row) => String(row.landing_page_slug || "").trim());
  const result: CleanupResult = {
    ok: true,
    found: rows.length,
    archived: 0,
    items: [],
    dryRun,
  };

  for (const row of rows) {
    const landingPageSlug = String(row.landing_page_slug || "").trim();
    const notes = appendNote(
      row.notes,
      "Arquivado da fila de reviews: o produto já é coberto pela landing page /" + landingPageSlug + "."
    );

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("product_links")
        .update({ status: "archived", notes, updated_at: new Date().toISOString() })
        .eq("id", String(row.id));
      if (updateError) continue;
    }

    result.archived += 1;
    result.items.push({
      slug: String(row.slug || ""),
      product: String(row.product_name || ""),
      landingPageSlug,
    });
  }

  return result;
}
