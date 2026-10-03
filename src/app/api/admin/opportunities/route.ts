import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { fetchAllReviews } from "@/lib/data";
import { buildBuyingGuideCategories, buildBuyingIntentPages } from "@/lib/buying";
import { fetchSearchConsoleRows } from "@/lib/search-console";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reviews, searchConsole] = await Promise.all([
    fetchAllReviews(),
    fetchSearchConsoleRows(),
  ]);

  const published = reviews.filter((review) => review.status === "published");
  const guides = buildBuyingGuideCategories(reviews, 3);
  const intents = buildBuyingIntentPages(reviews, 4);

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
    .reduce<Map<string, { page: string; impressions: number; clicks: number; positionSum: number; rows: number }>>(
      (map, row) => {
        const page = row.keys?.[1] || "";
        if (!page) return map;
        const current = map.get(page) || { page, impressions: 0, clicks: 0, positionSum: 0, rows: 0 };
        current.impressions += row.impressions || 0;
        current.clicks += row.clicks || 0;
        current.positionSum += row.position || 0;
        current.rows += 1;
        map.set(page, current);
        return map;
      },
      new Map()
    );

  const pages = Array.from(pageOpportunities.values())
    .map((item) => ({
      page: item.page,
      impressions: Math.round(item.impressions),
      clicks: Math.round(item.clicks),
      avgPosition: Number((item.positionSum / item.rows).toFixed(1)),
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
    .filter((category) => !intents.some((item) => item.categorySlug === category.slug && item.intent === "baratos"))
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
    },
    inventory: {
      publishedReviews: published.length,
      comparisons: 0,
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
