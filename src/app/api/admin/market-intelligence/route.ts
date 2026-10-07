import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { collectMarketIntelligence } from "@/lib/market-intelligence";

export const dynamic = "force-dynamic";

async function collectAndStore() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { response: NextResponse.json({ error: "Supabase service client not configured" }, { status: 500 }) };

  try {
    const intelligence = await collectMarketIntelligence();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    const rows = intelligence.opportunities.map((item) => ({
      keyword: item.keyword,
      normalized_keyword: item.keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
      intent: item.intent,
      source: item.source,
      source_count: item.sources.length,
      demand_score: item.demandScore,
      trend_score: item.trendScore,
      commercial_score: item.commercialScore,
      competition_score: item.competitionScore,
      vetor_fit_score: item.vetorFitScore,
      opportunity_score: item.opportunityScore,
      trend_direction: item.trendDirection,
      current_impressions: item.impressions,
      current_clicks: item.clicks,
      current_ctr: item.ctr,
      current_position: item.position,
      suggested_route: item.suggestedRoute || null,
      last_source_at: now,
      last_seen_at: now,
      metadata: { sources: item.sources, period: intelligence.searchConsole.period },
    }));

    let stored = 0;
    if (rows.length) {
      const { data: saved, error } = await supabase
        .from("seo_keywords")
        .upsert(rows, { onConflict: "keyword" })
        .select("id,keyword");
      if (error) throw new Error(error.message);

      const idByKeyword = new Map((saved || []).map((x) => [x.keyword, x.id]));
      const snapshots = rows
        .map((row) => {
          const id = idByKeyword.get(row.keyword);
          const item = intelligence.opportunities.find((x) => x.keyword === row.keyword);
          return id && item
            ? {
                keyword_id: id,
                snapshot_date: today,
                source: "market_intelligence",
                demand_score: item.demandScore,
                trend_score: item.trendScore,
                commercial_score: item.commercialScore,
                competition_score: item.competitionScore,
                vetor_fit_score: item.vetorFitScore,
                opportunity_score: item.opportunityScore,
                impressions: item.impressions,
                clicks: item.clicks,
                position: item.position,
                metadata: { sources: item.sources },
              }
            : null;
        })
        .filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot !== null);

      if (snapshots.length) {
        const { error: snapshotError } = await supabase
          .from("seo_keyword_snapshots")
          .upsert(snapshots, { onConflict: "keyword_id,snapshot_date,source" });
        if (snapshotError) throw new Error(snapshotError.message);
      }
      stored = rows.length;
    }

    const trendRows = intelligence.trends.map((t) => ({
      fingerprint:
        t.term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") +
        ":" + today,
      term: t.term,
      traffic: t.traffic,
      trend_percent: t.trendPercent,
      source: t.source,
      source_url: t.sourceUrl,
    }));

    if (trendRows.length) {
      const { error } = await supabase
        .from("market_trend_events")
        .upsert(trendRows, { onConflict: "fingerprint" });
      if (error) throw new Error(error.message);
    }

    return {
      response: NextResponse.json({
        ok: true,
        opportunities: intelligence.opportunities,
        trends: intelligence.trends,
        searchConsole: intelligence.searchConsole,
        stored,
        capturedAt: now,
      }),
    };
  } catch (error) {
    return {
      response: NextResponse.json(
        { error: error instanceof Error ? error.message : "Erro ao coletar inteligência de mercado." },
        { status: 500 }
      ),
    };
  }
}

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return (await collectAndStore()).response;
}

export async function POST(request: Request) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return (await collectAndStore()).response;
}
