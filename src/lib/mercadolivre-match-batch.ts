import type { SupabaseClient } from "@supabase/supabase-js";
import { searchMercadoLivreProduct } from "@/lib/mercadolivre-search";

const SITE_ID = "MLB";

type SearchEligibleLink = {
  id: string;
  name: string;
  marketplace: string | null;
  category: string | null;
  slug: string;
  status: string | null;
  destination_url: string | null;
  product_url: string | null;
  final_url: string | null;
  source_type: string | null;
  priority: number | null;
};

export interface MercadoLivreMatchBatchResult {
  processed: number;
  totalCandidates: number;
  remaining: number;
  results?: Array<Record<string, unknown>>;
  message?: string;
}

function normalizeMarketplace(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/[-_ ]/g, "");
}

function isPendingComparisonProduct(link: {
  source_type?: string | null;
  destination_url?: string | null;
  status?: string | null;
}): boolean {
  return (
    link.source_type === "comparison_product" &&
    link.status !== "archived" &&
    !String(link.destination_url || "").trim()
  );
}

function isSearchEligible(link: {
  marketplace?: string | null;
  source_type?: string | null;
  destination_url?: string | null;
  status?: string | null;
}): boolean {
  return (
    link.status !== "archived" &&
    (
      normalizeMarketplace(link.marketplace) === "mercadolivre" ||
      isPendingComparisonProduct(link)
    )
  );
}

/**
 * Errored candidates are retried on a later run instead of inside the same
 * batch loop. Without this cooldown the loop keeps selecting the same failing
 * subset forever and the remaining candidates are never matched.
 */
export const MATCH_ERROR_RETRY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

type MatchHistoryRow = {
  affiliate_link_id: string;
  checked_at: string | null;
  match_status: string | null;
};

const FINAL_MATCH_STATUSES = ["matched", "review", "no_match"];

export type BatchSelection = {
  selected: SearchEligibleLink[];
  checkedIds: Set<string>;
  errorIds: Set<string>;
};

/**
 * Picks the next candidates for a matching batch. Pure function so the
 * selection rules (including the error cooldown) can be regression tested
 * without touching the Mercado Livre API.
 */
export function selectBatchCandidates(
  eligibleLinks: SearchEligibleLink[],
  matches: MatchHistoryRow[],
  options: {
    limit: number;
    refresh?: boolean;
    now?: number;
    errorCooldownMs?: number;
  }
): BatchSelection {
  const refresh = Boolean(options.refresh);
  const now = options.now ?? Date.now();
  const errorCooldownMs = options.errorCooldownMs ?? MATCH_ERROR_RETRY_COOLDOWN_MS;
  const eligibleLinkIds = new Set(eligibleLinks.map((link) => String(link.id)));

  const checkedIds = new Set<string>();
  const errorIds = new Set<string>();
  const matchByLinkId = new Map<string, MatchHistoryRow>();

  for (const row of matches || []) {
    const linkId = String(row.affiliate_link_id || "");
    if (!linkId || !eligibleLinkIds.has(linkId)) continue;
    matchByLinkId.set(linkId, row);
    if (!row.checked_at) continue;

    const status = String(row.match_status || "");
    if (FINAL_MATCH_STATUSES.includes(status)) {
      checkedIds.add(linkId);
      continue;
    }
    if (status === "error") {
      const checkedAt = Date.parse(String(row.checked_at)) || 0;
      // Recent failures stay out of this run so the batch moves forward; they
      // become eligible again once the cooldown expires.
      if (checkedAt > 0 && now - checkedAt < errorCooldownMs) {
        checkedIds.add(linkId);
        errorIds.add(linkId);
      }
    }
  }

  const selected = eligibleLinks
    .filter((link) => refresh || !checkedIds.has(String(link.id)))
    .sort((a, b) => {
      if (refresh) {
        const aCheckedAt = Date.parse(String(matchByLinkId.get(String(a.id))?.checked_at || "")) || 0;
        const bCheckedAt = Date.parse(String(matchByLinkId.get(String(b.id))?.checked_at || "")) || 0;
        if (aCheckedAt !== bCheckedAt) return aCheckedAt - bCheckedAt;
      }
      const pendingPriority =
        Number(isPendingComparisonProduct(b)) - Number(isPendingComparisonProduct(a));
      if (pendingPriority !== 0) return pendingPriority;
      const priorityDifference = Number(b.priority || 0) - Number(a.priority || 0);
      if (priorityDifference !== 0) return priorityDifference;
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    })
    .slice(0, Math.max(Number(options.limit) || 0, 0));

  return { selected, checkedIds, errorIds };
}

/**
 * Runs one Mercado Livre matching batch. Shared by the admin route and the
 * GitHub Actions refill workflow so both use the same eligibility rules.
 */
export async function runMercadoLivreMatchBatch(
  supabase: SupabaseClient,
  options: { limit?: number; refresh?: boolean } = {}
): Promise<MercadoLivreMatchBatchResult> {
  const limit = Math.min(Math.max(Number(options.limit || 8), 1), 20);
  const refresh = Boolean(options.refresh);

  const [{ data: links, error: linksError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase
        .from("affiliate_links")
        .select("id,name,marketplace,category,slug,status,destination_url,product_url,final_url,source_type,priority")
        .order("priority", { ascending: false })
        .order("name"),
      supabase
        .from("affiliate_link_ml_matches")
        .select("affiliate_link_id,checked_at,match_status,updated_at"),
    ]);

  if (linksError) throw new Error(linksError.message);
  if (matchesError) throw new Error(matchesError.message);

  const eligibleLinks = ((links || []) as SearchEligibleLink[]).filter(isSearchEligible);
  const { selected, checkedIds } = selectBatchCandidates(eligibleLinks, matches || [], {
    limit,
    refresh,
  });

  if (!selected.length) {
    return {
      processed: 0,
      totalCandidates: 0,
      remaining: 0,
      message: refresh
        ? "Nenhum produto elegível para reprocessar."
        : "Todos os produtos elegíveis, incluindo comparativos sem link, já foram pesquisados.",
    };
  }

  const processed: Array<Record<string, unknown>> = [];
  const seenQuery = new Map<string, Awaited<ReturnType<typeof searchMercadoLivreProduct>>>();

  for (const link of selected) {
    const searchQuery = String(link.name || "").trim();
    const sourceUrl = String(
      link.product_url ||
      link.final_url ||
      link.destination_url ||
      ""
    ).trim();
    const cacheKey = searchQuery + "|" + sourceUrl;
    let result = seenQuery.get(cacheKey);

    if (!result) {
      result = await searchMercadoLivreProduct(searchQuery, sourceUrl);
      seenQuery.set(cacheKey, result);
    }

    const selectedCandidate = result.selected;
    const { error } = await supabase.from("affiliate_link_ml_matches").upsert({
      affiliate_link_id: link.id,
      search_query: result.query,
      marketplace_site: SITE_ID,
      matched_item_id: selectedCandidate?.itemId || null,
      matched_product_id: selectedCandidate?.productId || null,
      matched_title: selectedCandidate?.title || null,
      matched_url: selectedCandidate?.url || null,
      sold_quantity: selectedCandidate?.soldQuantity ?? null,
      rank_position: null,
      match_score: selectedCandidate?.score ?? null,
      match_status: result.matchStatus,
      checked_at: new Date().toISOString(),
      error_message: result.errorMessage,
      candidate_data: result.candidates,
      updated_at: new Date().toISOString(),
    }, { onConflict: "affiliate_link_id" });

    processed.push({
      id: link.id,
      slug: link.slug,
      name: link.name,
      ok: !error && result.matchStatus !== "error",
      matchStatus: result.matchStatus,
      matchedTitle: selectedCandidate?.title || null,
      matchedUrl: selectedCandidate?.url || null,
      soldQuantity: selectedCandidate?.soldQuantity ?? null,
      score: selectedCandidate?.score ?? null,
      error: error?.message || result.errorMessage || null,
    });
  }

  return {
    processed: processed.length,
    totalCandidates: selected.length,
    remaining: Math.max(
      0,
      eligibleLinks.length -
        (refresh ? processed.length : checkedIds.size + processed.length)
    ),
    results: processed,
  };
}
