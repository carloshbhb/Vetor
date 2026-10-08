import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { fetchAllReviews, fetchAllViralArticles } from "@/lib/data";
import { buildBuyingGuideCategories, buildBuyingIntentPages } from "@/lib/buying";
import { fetchSearchConsoleRows } from "@/lib/search-console";
import { createSeoActionFingerprint } from "@/lib/seo-actions";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SummaryItem = {
  impressions: number;
  clicks: number;
  positionWeighted: number;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toCategorySlug(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildTitleSuggestion(query: string): string {
  return (
    titleCase(query.trim().replace(/\s+/g, " ")) +
    " — preços, avaliações e guia de compra | Vetor.blog"
  ).slice(0, 68);
}

function getCommercialIntent(
  query: string
): "melhores" | "baratos" | "custo-beneficio" | "review" | null {
  const normalized = normalizeText(query);
  if (normalized.includes("custo beneficio")) return "custo-beneficio";
  if (/\bbarato\b|\bbaratos\b|\bbarata\b|\bbaratas\b/.test(normalized)) return "baratos";
  if (/\breview\b|\banalise\b|\bavaliacao\b/.test(normalized)) return "review";
  if (normalized.includes("melhor")) return "melhores";
  return null;
}

function inferPageTitle(
  page: string,
  reviews: Awaited<ReturnType<typeof fetchAllReviews>>,
  articles: Awaited<ReturnType<typeof fetchAllViralArticles>>
): string {
  try {
    const url = new URL(page);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (pathname.startsWith("/reviews/")) {
      const slug = pathname.split("/")[2];
      const review = reviews.find((item) => item.slug === slug);
      if (review) return review.meta_title || review.product;
    }
    if (pathname.startsWith("/comparativos/")) {
      const slug = pathname.split("/")[2];
      const article = articles.find((item) => item.slug === slug);
      if (article) return article.seo_title || article.title;
    }
  } catch {
    return page;
  }
  return page;
}


export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceKeyClient();
  const [reviews, articles, searchConsole, keywordRows] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
    fetchSearchConsoleRows(),
    supabase
      ? supabase
          .from("seo_keywords")
          .select("keyword,intent,opportunity_score,vetor_fit_score,commercial_score,competition_score,current_impressions,current_clicks,current_ctr,current_position,suggested_route,metadata")
          .order("opportunity_score", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (keywordRows.error) {
    console.error("[SEO] Could not load keyword intelligence:", keywordRows.error.message);
  }

  const published = reviews.filter((review) => review.status === "published");

  const validReviewSlugs = new Set(published.map((review) => review.slug));
  const validGuideRoutes = new Set([
    ...guides.map((guide) => "/melhores/" + guide.slug + "/"),
    ...intents.map((item) => "/melhores/" + item.categorySlug + "/" + item.intent + "/"),
  ]);
  const keywordIntelligence = (keywordRows.data || [])
    .map((row) => {
      const route = row.suggested_route ? String(row.suggested_route) : "";
      const normalized = normalizeText(String(row.keyword || ""));
      const fit = Number(row.vetor_fit_score || 0);
      const opportunity = Number(row.opportunity_score || 0);
      const routeExists =
        (route.startsWith("/reviews/") && validReviewSlugs.has(route.split("/")[2] || "")) ||
        validGuideRoutes.has(route);
      const stale = /\b2025\b|\b2024\b/.test(normalized);
      const relevant = !stale && fit >= 70 && opportunity >= 35 && (routeExists || fit >= 82);
      const reason = stale
        ? "Termo temporal antigo; não priorizar como pauta nova."
        : routeExists
          ? "Há uma rota editorial válida no inventário do Vetor."
          : fit >= 82
            ? "Aderência forte à cobertura comercial do Vetor; validar SERP antes de criar URL."
            : "Aderência insuficiente para priorização.";
      return {
        keyword: String(row.keyword || ""),
        intent: String(row.intent || ""),
        opportunityScore: opportunity,
        vetorFitScore: fit,
        commercialScore: Number(row.commercial_score || 0),
        competitionScore: Number(row.competition_score || 0),
        impressions: Number(row.current_impressions || 0),
        clicks: Number(row.current_clicks || 0),
        ctr: Number(row.current_ctr || 0),
        position: row.current_position == null ? null : Number(row.current_position),
        suggestedRoute: route,
        routeExists,
        relevant,
        reason,
      };
    })
    .filter((item) => item.relevant)
    .slice(0, 40);
  const guides = buildBuyingGuideCategories(reviews, 3);
  const intents = buildBuyingIntentPages(reviews, 4);
  const intentSet = new Set(
    intents.map((item) => item.categorySlug + ":" + item.intent)
  );

  const querySummary = new Map<string, SummaryItem>();
  const pageSummary = new Map<string, SummaryItem>();
  const queryPages = new Map<string, Map<string, SummaryItem>>();

  for (const row of searchConsole.rows) {
    const query = row.keys?.[0] || "";
    const page = row.keys?.[1] || "";
    const impressions = row.impressions || 0;
    const clicks = row.clicks || 0;
    const position = row.position || 0;

    if (query) {
      const current = querySummary.get(query) || {
        impressions: 0,
        clicks: 0,
        positionWeighted: 0,
      };
      current.impressions += impressions;
      current.clicks += clicks;
      current.positionWeighted += position * impressions;
      querySummary.set(query, current);

      if (page) {
        const byPage = queryPages.get(query) || new Map<string, SummaryItem>();
        const currentPage = byPage.get(page) || {
          impressions: 0,
          clicks: 0,
          positionWeighted: 0,
        };
        currentPage.impressions += impressions;
        currentPage.clicks += clicks;
        currentPage.positionWeighted += position * impressions;
        byPage.set(page, currentPage);
        queryPages.set(query, byPage);
      }
    }

    if (page) {
      const current = pageSummary.get(page) || {
        impressions: 0,
        clicks: 0,
        positionWeighted: 0,
      };
      current.impressions += impressions;
      current.clicks += clicks;
      current.positionWeighted += position * impressions;
      pageSummary.set(page, current);
    }
  }
  const totalImpressions = searchConsole.rows.reduce(
    (sum, row) => sum + (row.impressions || 0),
    0
  );
  const totalClicks = searchConsole.rows.reduce(
    (sum, row) => sum + (row.clicks || 0),
    0
  );
  const weightedPosition = searchConsole.rows.reduce(
    (sum, row) => sum + (row.position || 0) * (row.impressions || 0),
    0
  );

  const topQueries = Array.from(querySummary.entries())
    .map(([query, item]) => ({
      query,
      impressions: Math.round(item.impressions),
      clicks: Math.round(item.clicks),
      ctr: item.impressions
        ? Number(((item.clicks / item.impressions) * 100).toFixed(2))
        : 0,
      avgPosition: item.impressions
        ? Number((item.positionWeighted / item.impressions).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  const topPages = Array.from(pageSummary.entries())
    .map(([page, item]) => ({
      page,
      impressions: Math.round(item.impressions),
      clicks: Math.round(item.clicks),
      avgPosition: item.impressions
        ? Number((item.positionWeighted / item.impressions).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  const ctrOpportunities = searchConsole.rows
    .filter((row) => {
      const impressions = row.impressions || 0;
      const position = row.position || 0;
      const ctr = row.ctr || 0;
      return impressions >= 20 && position >= 4 && position <= 15 && ctr < 0.05;
    })
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
    .slice(0, 20)
    .map((row) => {
      const query = row.keys?.[0] || "";
      const page = row.keys?.[1] || "";
      return {
        query,
        page,
        currentTitle: inferPageTitle(page, reviews, articles),
        impressions: Math.round(row.impressions || 0),
        clicks: Math.round(row.clicks || 0),
        ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
        position: Number((row.position || 0).toFixed(1)),
        titleSuggestion: buildTitleSuggestion(query),
      };
    });

  const positionOpportunities = Array.from(pageSummary.entries())
    .map(([page, item]) => ({
      page,
      impressions: Math.round(item.impressions),
      clicks: Math.round(item.clicks),
      avgPosition: item.impressions
        ? Number((item.positionWeighted / item.impressions).toFixed(1))
        : 0,
    }))
    .filter((item) => item.impressions >= 30 && item.avgPosition >= 5 && item.avgPosition <= 15)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map((item) => ({
      ...item,
      action:
        item.avgPosition <= 10
          ? "Revisar CTR e elementos de destaque"
          : "Reforçar relevância, conteúdo e links internos",
    }));

  const cannibalization = Array.from(queryPages.entries())
    .map(([query, pagesForQuery]) => {
      const pages = Array.from(pagesForQuery.entries())
        .map(([page, item]) => ({
          page,
          impressions: Math.round(item.impressions),
          clicks: Math.round(item.clicks),
          avgPosition: item.impressions
            ? Number((item.positionWeighted / item.impressions).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.impressions - a.impressions);

      const total = pages.reduce((sum, item) => sum + item.impressions, 0);
      const leaderShare = total ? pages[0].impressions / total : 1;

      return {
        query,
        impressions: total,
        pages,
        leaderShare: Number((leaderShare * 100).toFixed(1)),
      };
    })
    .filter(
      (item) =>
        item.impressions >= 30 &&
        item.pages.length >= 2 &&
        item.leaderShare < 85
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((item) => ({
      ...item,
      action:
        "Revisar a intenção de cada URL e decidir se elas devem se diferenciar, fortalecer uma página principal ou consolidar conteúdo.",
    }));

  const reviewByPath = new Map(
    reviews
      .filter((review) => review.status === "published")
      .map((review) => ["/reviews/" + review.slug + "/", review])
  );

  const contentGaps = topQueries
    .map((item) => {
      const intent = getCommercialIntent(item.query);
      if (!intent || item.impressions < 20) return null;

      const rankedPages = Array.from(queryPages.get(item.query)?.entries() || [])
        .map(([page, stats]) => ({
          page,
          impressions: stats.impressions,
          avgPosition: stats.impressions
            ? stats.positionWeighted / stats.impressions
            : 0,
        }))
        .sort((a, b) => b.impressions - a.impressions);

      const leadingPage = rankedPages[0]?.page || "";
      const review = reviewByPath.get(leadingPage);
      const categorySlug = review ? toCategorySlug(review.category) : "";

      if (review && intent === "melhores" && categorySlug) {
        const hasGuide = guides.some((guide) => guide.slug === categorySlug);
        if (!hasGuide) {
          return {
            query: item.query,
            impressions: item.impressions,
            avgPosition: item.avgPosition,
            leadingPage,
            signal: "Consulta de intenção 'melhores' chegando a uma review individual.",
            suggestedRoute: "/melhores/" + categorySlug + "/",
          };
        }
      }

      if (review && intent === "baratos" && categorySlug) {
        if (!intentSet.has(categorySlug + ":baratos")) {
          return {
            query: item.query,
            impressions: item.impressions,
            avgPosition: item.avgPosition,
            leadingPage,
            signal:
              "Consulta de preço chegando a uma review individual sem seleção 'Mais baratos' disponível.",
            suggestedRoute: "/melhores/" + categorySlug + "/baratos/",
          };
        }
      }

      if (review && intent === "custo-beneficio" && categorySlug) {
        if (!intentSet.has(categorySlug + ":custo-beneficio")) {
          return {
            query: item.query,
            impressions: item.impressions,
            avgPosition: item.avgPosition,
            leadingPage,
            signal:
              "Consulta de custo-benefício chegando a uma review individual sem seleção específica disponível.",
            suggestedRoute:
              "/melhores/" + categorySlug + "/custo-beneficio/",
          };
        }
      }

      return null;
    })
    .filter(
      (
        item
      ): item is {
        query: string;
        impressions: number;
        avgPosition: number;
        leadingPage: string;
        signal: string;
        suggestedRoute: string;
      } => Boolean(item)
    )
    .slice(0, 20);

  const actionQueue = [
    ...ctrOpportunities.slice(0, 10).map((item) => ({
      type: "CTR",
      priority: item.impressions >= 100 ? "Alta" : "Média",
      title: "Revisar título e snippet",
      detail: item.query,
      evidence: `${item.impressions} impressões · CTR ${item.ctr}% · posição ${item.position}`,
      action: "Comparar o title atual com a intenção da query e testar uma versão mais específica.",
      source: "Search Console + regra Fase 5",
      href: item.page,
      fingerprint: createSeoActionFingerprint({
        type: "CTR",
        detail: item.query,
        href: item.page,
      }),
      impressions: item.impressions,
      brief: {
        objective: "Aumentar a clareza e a atratividade do resultado para a consulta que já gera impressões.",
        contentAction: "Revisar title e, quando disponível no projeto, a descrição da página. Preservar a intenção principal e evitar promessas não sustentadas.",
        suggestedTitle: item.titleSuggestion,
        validation: "Comparar CTR e posição após a próxima coleta de dados; não tratar uma variação isolada como causalidade.",
      },
    })),
    ...positionOpportunities.slice(0, 10).map((item) => ({
      type: "POSIÇÃO",
      priority: item.impressions >= 100 ? "Alta" : "Média",
      title: "Reforçar página",
      detail: item.page,
      evidence: `${item.impressions} impressões · posição média ${item.avgPosition}`,
      action: item.action,
      source: "Search Console + regra Fase 5",
      href: item.page,
      fingerprint: createSeoActionFingerprint({
        type: "POSIÇÃO",
        detail: item.page,
        href: item.page,
      }),
      impressions: item.impressions,
      brief: {
        objective: "Reforçar a capacidade da página de responder à intenção já observada.",
        contentAction: "Revisar cobertura do tema, hierarquia dos headings, trechos que respondem diretamente à intenção e links internos contextuais.",
        suggestedTitle: "",
        validation: "Verificar evolução de posição, impressões e cliques no mesmo período de comparação.",
      },
    })),
    ...cannibalization.slice(0, 8).map((item) => ({
      type: "CANIBALIZAÇÃO",
      priority: item.impressions >= 100 ? "Alta" : "Média",
      title: "Investigar sobreposição de URLs",
      detail: item.query,
      evidence: `${item.impressions} impressões · ${item.pages.length} URLs · líder ${item.leaderShare}%`,
      action: item.action,
      source: "Search Console + regra Fase 5",
      href: item.pages[0]?.page || "",
      fingerprint: createSeoActionFingerprint({
        type: "CANIBALIZAÇÃO",
        detail: item.query,
        href: item.pages[0]?.page || "",
      }),
      impressions: item.impressions,
      brief: {
        objective: "Entender se múltiplas URLs estão atendendo a mesma intenção e decidir uma diferenciação editorial.",
        contentAction: "Comparar títulos, intenção, cobertura e links internos das URLs. Diferenciar, fortalecer uma página principal ou consolidar somente após revisão editorial.",
        suggestedTitle: "",
        validation: "Registrar a decisão adotada e acompanhar as mesmas queries nas próximas coletas.",
      },
    })),
    ...contentGaps.slice(0, 10).map((item) => ({
      type: "LACUNA",
      priority: item.impressions >= 100 ? "Alta" : "Média",
      title: "Avaliar expansão de conteúdo",
      detail: item.query,
      evidence: `${item.impressions} impressões · posição média ${item.avgPosition}`,
      action: item.signal + " Rota sugerida: " + item.suggestedRoute,
      source: "Search Console + regra Fase 5",
      href: item.suggestedRoute,
      fingerprint: createSeoActionFingerprint({
        type: "LACUNA",
        detail: item.query,
        href: item.suggestedRoute,
      }),
      impressions: item.impressions,
      brief: {
        objective: "Avaliar a criação ou expansão de uma página alinhada à intenção comercial detectada.",
        contentAction: "Validar a intenção, checar cobertura existente e somente então criar ou expandir a rota sugerida.",
        suggestedTitle: buildTitleSuggestion(item.query),
        validation: "Confirmar que a nova página tem conteúdo substancial e não duplica a intenção de uma URL existente.",
      },
    })),
  ]
    .sort((a, b) => {
      const priority = { Alta: 2, Média: 1 };
      const byPriority =
        priority[b.priority as keyof typeof priority] -
        priority[a.priority as keyof typeof priority];
      return byPriority || b.impressions - a.impressions;
    })
    .slice(0, 25);

  const queryOpportunities = searchConsole.rows
    .filter((row) => {
      const impressions = row.impressions || 0;
      const position = row.position || 0;
      const ctr = row.ctr || 0;
      return impressions >= 20 && position >= 4 && position <= 20 && ctr < 0.05;
    })
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
    .slice(0, 25)
    .map((row) => ({
      query: row.keys?.[0] || "",
      page: row.keys?.[1] || "",
      impressions: Math.round(row.impressions || 0),
      clicks: Math.round(row.clicks || 0),
      ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
      position: Number((row.position || 0).toFixed(1)),
      action: (row.position || 0) <= 10 ? "Melhorar CTR" : "Reforçar relevância",
    }));

  const pageOpportunities = searchConsole.rows
    .filter((row) => {
      const impressions = row.impressions || 0;
      const position = row.position || 0;
      return impressions >= 30 && position >= 8 && position <= 25;
    })
    .reduce<
      Map<
        string,
        { page: string; impressions: number; clicks: number; positionWeighted: number }
      >
    >((map, row) => {
      const page = row.keys?.[1] || "";
      if (!page) return map;
      const current = map.get(page) || {
        page,
        impressions: 0,
        clicks: 0,
        positionWeighted: 0,
      };
      current.impressions += row.impressions || 0;
      current.clicks += row.clicks || 0;
      current.positionWeighted += (row.position || 0) * (row.impressions || 0);
      map.set(page, current);
      return map;
    }, new Map());

  const pages = Array.from(pageOpportunities.values())
    .map((item) => ({
      page: item.page,
      impressions: Math.round(item.impressions),
      clicks: Math.round(item.clicks),
      avgPosition: item.impressions
        ? Number((item.positionWeighted / item.impressions).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  const thinCategories = guides
    .filter((category) => category.count < 5)
    .map((category) => ({
      category: category.name,
      slug: category.slug,
      reviews: category.count,
      action: "Adicionar reviews antes de expandir a intenção comercial",
    }));

  const missingIntent = guides
    .filter(
      (category) =>
        !intents.some(
          (item) => item.categorySlug === category.slug && item.intent === "baratos"
        )
    )
    .slice(0, 15)
    .map((category) => ({
      category: category.name,
      slug: category.slug,
      reviews: category.count,
      action: "Avaliar página Mais baratos quando houver pelo menos 4 reviews com preço",
    }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    period: { startDate: searchConsole.startDate, endDate: searchConsole.endDate },
    searchConsole: {
      configured: searchConsole.configured,
      error: searchConsole.error || null,
      rows: searchConsole.rows.length,
      uniqueQueries: querySummary.size,
      totalClicks: Math.round(totalClicks),
      totalImpressions: Math.round(totalImpressions),
      averageCtr: totalImpressions
        ? Number(((totalClicks / totalImpressions) * 100).toFixed(2))
        : 0,
      averagePosition: totalImpressions
        ? Number((weightedPosition / totalImpressions).toFixed(1))
        : 0,
      topQueries,
      topPages,
    },
    inventory: {
      publishedReviews: published.length,
      comparisons: articles.length,
      buyingGuides: guides.length,
      buyingIntentPages: intents.length,
    },
    queryOpportunities,
    pages,
    intelligence: {
      ctrOpportunities,
      positionOpportunities,
      cannibalization,
      contentGaps,
    },
    actionQueue,
    contentOpportunities: {
      thinCategories,
      missingIntent,
    },
    keywordIntelligence: {
      totalStored: keywordRows.data?.length || 0,
      relevant: keywordIntelligence.length,
      lowFit: Math.max(0, (keywordRows.data?.length || 0) - keywordIntelligence.length),
      items: keywordIntelligence,
    },
  });
}
