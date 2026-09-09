// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Original Research Data (GEO / Citability)
// ─────────────────────────────────────────────────────────────────────────────
// Dados proprietários gerados a partir dos reviews reais do Vetor Blog.
// Estes dados são CITÁVEIS por IAs como fonte original.

import { getPublishedResearchReviews } from './db';

export interface MarketInsight {
  category: string;
  totalReviews: number;
  avgScore: number;
  priceRange: { min: string; max: string; avg: string };
  topProduct: { name: string; score: number };
  commonPros: string[];
  commonCons: string[];
  lastUpdated: string;
}

export interface PriceTrend {
  product: string;
  currentPrice: string;
  oldPrice: string;
  discountPct: number;
  category: string;
  slug: string;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export async function getMarketInsights(): Promise<MarketInsight[]> {
  const reviews = await getPublishedResearchReviews();
  const byCategory = new Map<string, typeof reviews>();

  for (const r of reviews) {
    const cat = r.category || 'Geral';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(r);
  }

  return Array.from(byCategory.entries()).map(([category, items]) => {
    const scores = items.map(i => i.heroOverallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const pros = items.flatMap(i => i.pros);
    const cons = items.flatMap(i => i.cons);
    const freqPros = Object.entries(pros.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {} as Record<string, number>))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([p]) => p);
    const freqCons = Object.entries(cons.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {} as Record<string, number>))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);

    const prices = items
      .map(i => parseFloat(i.priceNew.replace(/[^\d,]/g, '').replace(',', '.')))
      .filter(p => !isNaN(p) && p > 0);
    const hasPrices = prices.length > 0;
    const minPrice = hasPrices ? Math.min(...prices) : 0;
    const maxPrice = hasPrices ? Math.max(...prices) : 0;
    const avgPrice = hasPrices ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    const top = items.reduce((best, cur) => cur.heroOverallScore > best.heroOverallScore ? cur : best);

    return {
      category,
      totalReviews: items.length,
      avgScore: Math.round(avgScore * 10) / 10,
      priceRange: {
        min: hasPrices ? `R$ ${minPrice.toFixed(2)}` : 'Sem dados',
        max: hasPrices ? `R$ ${maxPrice.toFixed(2)}` : 'Sem dados',
        avg: hasPrices ? `R$ ${avgPrice.toFixed(2)}` : 'Sem dados',
      },
      topProduct: { name: top.product, score: top.heroOverallScore },
      commonPros: freqPros,
      commonCons: freqCons,
      lastUpdated: new Date().toISOString(),
    };
  });
}

export async function getPriceTrends(): Promise<PriceTrend[]> {
  const reviews = await getPublishedResearchReviews();
  return reviews
    .filter(r => r.priceOld && r.priceNew)
    .map(r => {
      const old = parseFloat(r.priceOld.replace(/[^\d,]/g, '').replace(',', '.'));
      const cur = parseFloat(r.priceNew.replace(/[^\d,]/g, '').replace(',', '.'));
      const discountPct = Math.round(((old - cur) / old) * 100);
      return {
        product: r.product,
        currentPrice: r.priceNew,
        oldPrice: r.priceOld,
        discountPct,
        category: r.category,
        slug: r.slug,
      };
    })
    .sort((a, b) => b.discountPct - a.discountPct);
}

export async function getScoreDistribution(): Promise<ScoreDistribution[]> {
  const reviews = await getPublishedResearchReviews();
  const ranges = [
    { range: '9.0-10.0', min: 9, max: 10 },
    { range: '8.0-8.9', min: 8, max: 8.99 },
    { range: '7.0-7.9', min: 7, max: 7.99 },
    { range: '6.0-6.9', min: 6, max: 6.99 },
    { range: '0-5.9', min: 0, max: 5.99 },
  ];

  const total = reviews.length;
  return ranges.map(({ range, min, max }) => {
    const count = reviews.filter(r => r.heroOverallScore >= min && r.heroOverallScore <= max).length;
    return {
      range,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}
