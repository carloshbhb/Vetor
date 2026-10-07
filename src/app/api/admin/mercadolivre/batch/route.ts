import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { searchMercadoLivreProduct } from "@/lib/mercadolivre-search";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SITE_ID = "MLB";

function normalizeMarketplace(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/[-_ ]/g, "");
}

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const [{ data: links, error: linksError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("affiliate_links").select("id,name,marketplace,category,slug,status,destination_url,product_url").order("name"),
    supabase.from("affiliate_link_ml_matches").select("*").order("updated_at", { ascending: false }),
  ]);

  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });
  if (matchesError) return NextResponse.json({ error: matchesError.message }, { status: 500 });

  const mlLinks = (links || []).filter((link) => normalizeMarketplace(link.marketplace) === "mercadolivre" && link.status !== "archived");
  const mlLinkIds = new Set(mlLinks.map((link) => String(link.id)));
  const relevantMatches = (matches || []).filter((match) => mlLinkIds.has(String(match.affiliate_link_id)));

  const counts = relevantMatches.reduce((acc, match) => {
    const key = String(match.match_status || "pending");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    siteId: SITE_ID,
    total: mlLinks.length,
    checked: relevantMatches.filter((match) => Boolean(match.checked_at)).length,
    remaining: mlLinks.length - relevantMatches.filter((match) => Boolean(match.checked_at)).length,
    counts,
    matches: relevantMatches,
  });
}

export async function POST(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  let body: { limit?: number; refresh?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const limit = Math.min(Math.max(Number(body.limit || 8), 1), 20);
  const refresh = Boolean(body.refresh);

  const [{ data: links, error: linksError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase
      .from("affiliate_links")
      .select("id,name,marketplace,category,slug,status,destination_url,product_url")
      .order("priority", { ascending: false })
      .order("name"),
    supabase
      .from("affiliate_link_ml_matches")
      .select("affiliate_link_id,checked_at"),
  ]);

  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });
  if (matchesError) return NextResponse.json({ error: matchesError.message }, { status: 500 });

  const checkedIds = new Set(
    (matches || [])
      .filter((row) => Boolean(row.checked_at))
      .map((row) => String(row.affiliate_link_id))
  );

  const selected = (links || [])
    .filter((link) => normalizeMarketplace(link.marketplace) === "mercadolivre" && link.status !== "archived")
    .filter((link) => refresh || !checkedIds.has(String(link.id)))
    .slice(0, limit);

  if (!selected.length) {
    return NextResponse.json({
      processed: 0,
      totalCandidates: 0,
      remaining: 0,
      message: refresh ? "Nenhum link do Mercado Livre disponível." : "Todos os links elegíveis já foram processados.",
    });
  }

  const processed: Array<Record<string, unknown>> = [];
  const seenQuery = new Map<string, Awaited<ReturnType<typeof searchMercadoLivreProduct>>>();

  for (const link of selected) {
    const searchQuery = String(link.name || "").trim();
    const sourceUrl = String(link.product_url || link.destination_url || "").trim();
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
      ok: !error,
      matchStatus: result.matchStatus,
      matchedTitle: selectedCandidate?.title || null,
      matchedUrl: selectedCandidate?.url || null,
      soldQuantity: selectedCandidate?.soldQuantity ?? null,
      score: selectedCandidate?.score ?? null,
      error: error?.message || result.errorMessage || null,
    });
  }

  const { count: remainingCount } = await supabase
    .from("affiliate_links")
    .select("id", { count: "exact", head: true })
    .in("status", ["active", "paused", "broken"]);

  return NextResponse.json({
    processed: processed.length,
    totalCandidates: selected.length,
    remaining: Math.max(0, (remainingCount || 0) - checkedIds.size - processed.length),
    results: processed,
  });
}
