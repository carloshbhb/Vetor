import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { runMercadoLivreMatchBatch } from "@/lib/mercadolivre-match-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SITE_ID = "MLB";

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

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const [{ data: links, error: linksError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("affiliate_links").select("id,name,marketplace,category,slug,status,destination_url,product_url,source_type").order("name"),
    supabase.from("affiliate_link_ml_matches").select("*").order("updated_at", { ascending: false }),
  ]);

  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });
  if (matchesError) return NextResponse.json({ error: matchesError.message }, { status: 500 });

  const allLinks = links || [];
  const mlLinks = allLinks.filter(isSearchEligible);
  const mlLinkIds = new Set(mlLinks.map((link) => String(link.id)));
  const relevantMatches = (matches || []).filter((match) => mlLinkIds.has(String(match.affiliate_link_id)));
  const checkedIds = new Set(
    relevantMatches
      .filter((match) =>
        Boolean(match.checked_at) &&
        ["matched", "review", "no_match"].includes(String(match.match_status || ""))
      )
      .map((match) => String(match.affiliate_link_id))
  );

  const counts = relevantMatches.reduce((acc, match) => {
    const key = String(match.match_status || "pending");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    siteId: SITE_ID,
    total: mlLinks.length,
    checked: checkedIds.size,
    remaining: Math.max(0, mlLinks.length - checkedIds.size),
    unlinkedComparisonProducts: allLinks.filter(isPendingComparisonProduct).length,
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

  try {
    const result = await runMercadoLivreMatchBatch(supabase, {
      limit: body.limit,
      refresh: body.refresh,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao executar o lote do Mercado Livre." },
      { status: 500 }
    );
  }
}
