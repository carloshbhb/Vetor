import { fetchSearchConsoleRows } from "@/lib/search-console";
import { getAllReviews } from "@/lib/supabase";

export type MarketTrendEvent = {
  term: string;
  traffic: string;
  trendPercent: number;
  source: string;
  sourceUrl: string;
};

export type KeywordOpportunity = {
  keyword: string;
  intent: string;
  source: string;
  demandScore: number;
  trendScore: number;
  commercialScore: number;
  competitionScore: number;
  vetorFitScore: number;
  opportunityScore: number;
  trendDirection: "rising" | "stable";
  impressions: number;
  clicks: number;
  ctr: number;
  position: number | null;
  suggestedRoute: string;
  sources: string[];
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function intentFor(keyword: string): string {
  const q = normalize(keyword);
  if (/\bmelhor(es)?\b/.test(q)) return "melhores";
  if (/\bbarat[oa]s?\b|\bpromocao\b|\bpreco\b|\bonde comprar\b/.test(q)) return "transacional";
  if (/\bvale a pena\b|\bvs\b|\bcomparativo\b|\bcomparar\b/.test(q)) return "comparativo";
  if (/\breview\b|\banalise\b|\bavaliacao\b/.test(q)) return "review";
  if (/\bcomo\b|\bqual\b|\bo que\b/.test(q)) return "informacional";
  return "comercial";
}
function clamp(value: number): number { return Math.max(0, Math.min(100, value)); }
function demandScore(impressions: number, maxImpressions: number): number {
  if (!impressions || !maxImpressions) return 5;
  return clamp(10 + (Math.log10(impressions + 1) / Math.log10(maxImpressions + 1)) * 90);
}
function commercialScore(keyword: string): number {
  switch (intentFor(keyword)) {
    case "transacional": return 100;
    case "melhores": return 95;
    case "comparativo": return 92;
    case "review": return 90;
    case "comercial": return 78;
    default: return 35;
  }
}
function routeFor(keyword: string, reviews: Awaited<ReturnType<typeof getAllReviews>>): string {
  const q = normalize(keyword);
  const match = reviews.find((r) => {
    const product = normalize(r.product || "");
    const tokens = product.split(" ").filter((x) => x.length > 2);
    return product && (q.includes(product) || (tokens.length >= 2 && tokens.every((token) => q.includes(token))));
  });
  if (match) return "/reviews/" + match.slug + "/";
  if (q.includes("melhor")) {
    const tail = q.replace(/\bmelhores?\b/g, "").trim().replace(/\s+/g, "-");
    return tail ? "/melhores/" + tail + "/" : "";
  }
  return "";
}

async function fetchTrends(): Promise<MarketTrendEvent[]> {
  try {
    const response = await fetch("https://trends.google.com/trending/rss?geo=BR", {
      headers: { "user-agent": "Vetor.blog Market Intelligence/1.0" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const events: MarketTrendEvent[] = [];
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items.slice(0, 100)) {
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || "").trim();
      const traffic = (item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || "").trim();
      const percent = Number((item.match(/<ht:approx_traffic_percent>(.*?)<\/ht:approx_traffic_percent>/)?.[1] || "0").replace(/[^0-9]/g, "")) || 0;
      const link = (item.match(/<link>(.*?)<\/link>/)?.[1] || "").trim();
      if (title) events.push({ term: title, traffic, trendPercent: percent, source: "google_trends_trending_now_br", sourceUrl: link });
    }
    return events;
  } catch { return []; }
}

async function fetchSuggestions(seed: string): Promise<string[]> {
  try {
    const url = "https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&q=" + encodeURIComponent(seed);
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 Vetor.blog" }, cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json() as unknown;
    return Array.isArray(data) && Array.isArray(data[1]) ? data[1].filter((x): x is string => typeof x === "string").slice(0, 8) : [];
  } catch { return []; }
}

export async function collectMarketIntelligence() {
  const [gsc, reviews, trends] = await Promise.all([fetchSearchConsoleRows(), getAllReviews(), fetchTrends()]);
  const byKeyword = new Map<string, { keyword: string; impressions: number; clicks: number; positionWeighted: number; sources: Set<string>; trendScore: number }>();

  for (const row of gsc.rows) {
    const keyword = row.keys?.[0]?.trim();
    if (!keyword) continue;
    const key = normalize(keyword);
    const item = byKeyword.get(key) || { keyword, impressions: 0, clicks: 0, positionWeighted: 0, sources: new Set<string>(), trendScore: 0 };
    item.impressions += row.impressions || 0;
    item.clicks += row.clicks || 0;
    item.positionWeighted += (row.position || 0) * (row.impressions || 0);
    item.sources.add("search_console");
    byKeyword.set(key, item);
  }

  const seeds = Array.from(byKeyword.values()).sort((a,b)=>b.impressions-a.impressions).slice(0, 30).map(x=>x.keyword);
  for (const review of reviews.slice(0, 40)) {
    if (review.product) seeds.push(review.product);
    if (review.category) seeds.push("melhor " + review.category);
  }
  const uniqueSeeds = [...new Set(seeds.map(normalize).filter(Boolean))].slice(0, 40);

  for (let i = 0; i < uniqueSeeds.length; i += 8) {
    const batch = await Promise.all(uniqueSeeds.slice(i, i + 8).map(fetchSuggestions));
    batch.flat().forEach((keyword) => {
      const key = normalize(keyword);
      if (!key) return;
      const item = byKeyword.get(key) || { keyword, impressions: 0, clicks: 0, positionWeighted: 0, sources: new Set<string>(), trendScore: 0 };
      item.sources.add("google_autocomplete");
      byKeyword.set(key, item);
    });
  }

  const maxImpressions = Math.max(1, ...Array.from(byKeyword.values()).map(x => x.impressions));
  for (const trend of trends) {
    const normalizedTrend = normalize(trend.term);
    for (const item of byKeyword.values()) {
      const q = normalize(item.keyword);
      const overlap = normalizedTrend.split(" ").filter(Boolean).filter((token) => q.includes(token)).length;
      if (q === normalizedTrend || (overlap >= 2 && normalizedTrend.length > 8)) {
        item.trendScore = Math.max(item.trendScore, clamp(55 + Math.min(45, trend.trendPercent / 20)));
        item.sources.add("google_trends");
      }
    }
  }

  const opportunities: KeywordOpportunity[] = Array.from(byKeyword.values()).map((item) => {
    const demand = demandScore(item.impressions, maxImpressions);
    const commercial = commercialScore(item.keyword);
    const position = item.impressions ? item.positionWeighted / item.impressions : null;
    const competition = position === null ? 60 : position <= 10 ? 35 : position <= 20 ? 55 : 75;
    const trend = item.trendScore || 10;
    const fit = routeFor(item.keyword, reviews) ? 100 : /\b(air fryer|smartband|fone|celular|notebook|tv|televisao|jbl|samsung|xiaomi|motorola|apple|sony|mondial|philips|electrolux|lg)\b/i.test(item.keyword) ? 82 : 35;
    const opportunity = clamp(demand * 0.28 + trend * 0.22 + commercial * 0.22 + (100 - competition) * 0.10 + fit * 0.18);
    return {
      keyword: item.keyword, intent: intentFor(item.keyword), source: Array.from(item.sources).join(","),
      demandScore: Number(demand.toFixed(1)), trendScore: Number(trend.toFixed(1)), commercialScore: commercial,
      competitionScore: competition, vetorFitScore: fit, opportunityScore: Number(opportunity.toFixed(1)),
      trendDirection: trend >= 55 ? "rising" : "stable", impressions: Math.round(item.impressions), clicks: Math.round(item.clicks),
      ctr: item.impressions ? Number(((item.clicks / item.impressions) * 100).toFixed(2)) : 0,
      position: position === null ? null : Number(position.toFixed(1)), suggestedRoute: routeFor(item.keyword, reviews),
      sources: Array.from(item.sources),
    };
  }).sort((a,b)=>b.opportunityScore-a.opportunityScore).slice(0, 250);

  return { opportunities, trends: trends.slice(0, 50), searchConsole: { configured: gsc.configured, error: gsc.error || null, period: { startDate: gsc.startDate, endDate: gsc.endDate } } };
}