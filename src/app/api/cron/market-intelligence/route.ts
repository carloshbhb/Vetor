import { NextResponse } from "next/server";
import { collectMarketIntelligence } from "@/lib/market-intelligence";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { createSeoActionFingerprint } from "@/lib/seo-actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service client not configured" }, { status: 500 });
  try {
    const intelligence = await collectMarketIntelligence();
    const today = new Date().toISOString().slice(0,10);
    const rows = intelligence.opportunities.map((item) => ({
      keyword: item.keyword, normalized_keyword: item.keyword.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim(),
      intent: item.intent, source: item.source, source_count: item.sources.length, demand_score: item.demandScore, trend_score: item.trendScore,
      commercial_score: item.commercialScore, competition_score: item.competitionScore, vetor_fit_score: item.vetorFitScore,
      opportunity_score: item.opportunityScore, trend_direction: item.trendDirection, current_impressions: item.impressions,
      current_clicks: item.clicks, current_ctr: item.ctr, current_position: item.position, suggested_route: item.suggestedRoute || null,
      last_source_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
      metadata: {
        sources: item.sources,
        period: intelligence.searchConsole.period,
        relevance: {
          score: item.vetorFitScore,
          status: item.vetorFitScore >= 72 ? "relevant" : "low_fit",
          reason: item.vetorFitScore >= 100
            ? "Correspondência direta com produto ou rota editorial existente."
            : item.vetorFitScore >= 72
              ? "Correspondência forte com uma família de produtos coberta pelo Vetor."
              : "Sinal insuficiente para priorização editorial do Vetor."
        }
      },
    }));
    if (rows.length) {
      const { data: saved, error } = await supabase.from("seo_keywords").upsert(rows, { onConflict: "keyword" }).select("id,keyword");
      if (error) throw new Error(error.message);
      const idByKeyword = new Map((saved || []).map((x) => [x.keyword, x.id]));
      const snapshots = rows.map((row) => { const item = intelligence.opportunities.find((x)=>x.keyword===row.keyword); const id=idByKeyword.get(row.keyword); return id&&item ? { keyword_id:id, snapshot_date:today, source:"market_intelligence", demand_score:item.demandScore, trend_score:item.trendScore, commercial_score:item.commercialScore, competition_score:item.competitionScore, vetor_fit_score:item.vetorFitScore, opportunity_score:item.opportunityScore, impressions:item.impressions, clicks:item.clicks, position:item.position, metadata:{sources:item.sources} } : null; }).filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot !== null);
      if (snapshots.length) { const {error:snapshotError}=await supabase.from("seo_keyword_snapshots").upsert(snapshots,{onConflict:"keyword_id,snapshot_date,source"}); if(snapshotError) throw new Error(snapshotError.message); }
    }
    const editorialActions = intelligence.opportunities
      .filter((item) => item.vetorFitScore >= 72 && item.opportunityScore >= 40)
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 40)
      .map((item) => ({
        fingerprint: createSeoActionFingerprint({
          type: "LACUNA",
          detail: "Keyword: " + item.keyword,
          href: item.suggestedRoute || "",
        }),
        signal_type: "LACUNA",
        priority: item.opportunityScore >= 55 ? "Alta" : "Média",
        title: "Oportunidade editorial: " + item.keyword,
        detail: "Keyword com aderência ao Vetor e potencial comercial identificado pelo radar.",
        evidence: "Score de oportunidade " + item.opportunityScore + "; fit Vetor " + item.vetorFitScore + "; impressões atuais " + item.impressions + ".",
        action: item.suggestedRoute
          ? "Revisar/fortalecer a página " + item.suggestedRoute + " antes de criar uma nova URL."
          : "Criar briefing e validar SERP antes de publicar uma nova página.",
        source: "market_intelligence",
        href: item.suggestedRoute || "",
        impressions: Math.max(0, Math.round(item.impressions)),
        brief: {
          objective: "Capturar demanda comercial sem criar conteúdo fora do escopo editorial do Vetor.",
          contentAction: item.suggestedRoute ? "Otimizar a URL existente." : "Validar SERP e criar conteúdo somente se houver intenção e produto compatíveis.",
          suggestedTitle: item.keyword + " | Vetor.blog",
          validation: "Confirmar intenção, concorrência e existência de oferta/produto antes da publicação."
        },
        status: "open",
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    if (editorialActions.length) {
      const { error: actionError } = await supabase
        .from("seo_action_history")
        .upsert(editorialActions, { onConflict: "fingerprint", ignoreDuplicates: false });
      if (actionError) throw new Error("Falha ao registrar fila SEO: " + actionError.message);
    }
    if (intelligence.trends.length) { const {error}=await supabase.from("market_trend_events").upsert(intelligence.trends.map((t)=>({fingerprint:t.term.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")+":"+today,term:t.term,traffic:t.traffic,trend_percent:t.trendPercent,source:t.source,source_url:t.sourceUrl})),{onConflict:"fingerprint"}); if(error) throw new Error(error.message); }
    const relevant = intelligence.opportunities.filter((item) => item.vetorFitScore >= 72 && item.opportunityScore >= 40).length;
    return NextResponse.json({
      ok: true,
      stored: rows.length,
      relevant,
      lowFit: rows.length - relevant,
      editorialQueue: editorialActions.length,
      trends: intelligence.trends.length,
      ranAt: new Date().toISOString()
    });
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:"Erro no ciclo de inteligência."},{status:500}); }
}