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
  errors: number;
  candidates: Array<{ name: string; matchedTitle: string | null; score: number | null }>;
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
    .select("source_ref")
    .eq("source_type", "social_list")
    .like("source_ref", "ml_social_list:" + ML_SOCIAL_LIST_ID + ":%");

  if (existingError) throw new Error(existingError.message);

  const existingRefs = new Set((existing || []).map((row) => String(row.source_ref)));
  const toInsert = products
    .filter((item) => !existingRefs.has("ml_social_list:" + ML_SOCIAL_LIST_ID + ":" + item.item_id))
    .map((item) => ({
      slug: "ml-lista-" + slugifyAffiliateName(item.title) + "-" + item.item_id.toLowerCase(),
      name: item.title,
      marketplace: "Mercado Livre",
      category: "Lista social",
      source_type: "social_list",
      source_ref: "ml_social_list:" + ML_SOCIAL_LIST_ID + ":" + item.item_id,
      destination_url: "",
      product_url: item.product_url,
      status: "active",
      priority: 5,
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
    alreadyImported: existingRefs.size,
    inserted: dryRun ? toInsert.length : inserted,
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
    .select("id,name,priority,status,source_type")
    .neq("status", "archived")
    .in("source_type", ["social_list", "comparison_product"])
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
    .select("affiliate_link_id,matched_item_id,matched_product_id,matched_title,matched_url,match_score,match_status,affiliate_links!inner(id,name,category,slug,destination_url,product_url,image_url,source_type,status,priority,tags,notes,affiliate_tag)")
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
    errors: 0,
    candidates: [],
    dryRun,
  };

  for (const row of rows) {
    const source = row.affiliate_links;
    if (!source) {
      result.skippedUnsafe += 1;
      continue;
    }

    const sourceType = String(source.source_type || "");
    const sourceStatus = String(source.status || "");
    const destination = String(source.destination_url || "").trim();
    const matchedUrl = String(row.matched_url || "").trim();
    const matchedItemId = String(row.matched_item_id || "").trim();
    const score = Number(row.match_score || 0);
    const name = String(source.name || "").trim();

    if (sourceStatus === "archived" || !["social_list", "comparison_product"].includes(sourceType)) {
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
