import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { fetchAllReviews, fetchAllViralArticles } from "@/lib/data";
import { buildBuyingGuideCategories, buildBuyingIntentPages } from "@/lib/buying";
import { fetchSearchConsoleRows } from "@/lib/search-console";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reviews, articles, searchConsole] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
    fetchSearchConsoleRows(),
  ]);

  const published = reviews.filter((review) => review.status === "published");
  const guides = buildBuyingGuideCategories(reviews, 3);
  const intents = buildBuyingIntentPages(reviews, 4);

  const querySummary = new Map<
    string,
    { query: string; impressions: number; clicks: number; positionWeighted: number }
  >();

  const pageSummary = new Map<
    string,
    { page: string; impressions: number; clicks: number; positionWeighted: number }
  >();

  for (const row of searchConsole.rows) {
    const query = row.keys?.[0] || "";
    const page = row.keys?.[1] || "";
    const impressions = row.impressions || 0;
    const clicks = row.clicks || 0;
    const position = row.position || 0;

    if (query) {
      const current = querySummary.get(query) || {
        query,
        impressions: 0,
        clicks: 0,
        positionWeighted: 0,
      };
      current.impressions += impressions;
      current.clicks += clicks;
      current.positionWeighted += position * impressions;
      querySummary.set(query, current);
    }

    if (page) {
      const current = pageSummary.get(page) || {
        page,
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

  const topQueries = Array.from(querySummary.values())
    .map((item) => ({
      query: item.query,
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

  const topPages = Array.from(pageSummary.values())
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
    contentOpportunities: {
      thinCategories,
      missingIntent,
    },
  });
}
