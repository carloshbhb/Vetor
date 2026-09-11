import { fetchMLProduct } from './mercadolivre';
import { generateText } from './ai';
import { getLightweightReviews, type LightweightReview } from './db';

export interface TrendSignal {
  product: string;
  category: string;
  source: 'youtube' | 'mercadolivre' | 'google_trends' | 'ai';
  score: number;
  volume?: string;
  competition?: string;
  launchDate?: string;
  reason?: string;
}

export interface ScanResult {
  trends: TrendSignal[];
  scannedAt: string;
  sourcesChecked: string[];
  newProducts: number;
}

const SCAN_CATEGORIES = [
  'Wearables / Smartbands',
  'Fones de Ouvido',
  'Notebooks',
  'Tablets',
  'Casa Inteligente',
  'Câmeras de Segurança',
  'Robôs Aspiradores',
  'Eletroportáteis',
  'Acessórios para Games',
];

const ML_QUERIES: Record<string, string> = {
  'Wearables / Smartbands': 'smartband mais vendida',
  'Fones de Ouvido': 'fone bluetooth mais vendido',
  'Notebooks': 'notebook mais vendido',
  'Tablets': 'tablet mais vendido',
  'Casa Inteligente': 'casa inteligente mais vendido',
  'Câmeras de Segurança': 'camera segurança mais vendida',
  'Robôs Aspiradores': 'robo aspirador mais vendido',
  'Eletroportáteis': 'eletroportatil mais vendido',
  'Acessórios para Games': 'acessorio games mais vendido',
};

function parsePriceFromML(product: string): number | null {
  const match = product.match(/R\$\s*([\d.,]+)/);
  if (!match) return null;
  const normalized = match[1].replace('.', '').replace(',', '.');
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

export function scoreTrend(signal: TrendSignal): number {
  let score = 0;

  if (signal.source === 'mercadolivre') {
    score += 30;
  } else if (signal.source === 'ai') {
    score += 20;
  } else if (signal.source === 'youtube') {
    score += 25;
  } else {
    score += 15;
  }

  if (signal.launchDate) {
    const launched = new Date(signal.launchDate);
    const now = new Date();
    const diffDays = (now.getTime() - launched.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
      score += 15;
    } else if (diffDays < 30) {
      score += 8;
    }
  }

  if (signal.competition === 'baixa') {
    score += 10;
  } else if (signal.competition === 'media') {
    score += 5;
  }

  if (signal.volume === 'alto') {
    score += 10;
  } else if (signal.volume === 'medio') {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

function priceRangeScore(price: number): number {
  if (price >= 50 && price <= 300) return 20;
  if (price > 300 && price <= 500) return 15;
  if (price > 500 && price <= 800) return 10;
  if (price > 800 && price <= 1000) return 5;
  return 0;
}

export async function scanMercadoLivreTrending(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];

  for (const category of SCAN_CATEGORIES) {
    const query = ML_QUERIES[category] || `mais vendido ${category}`;
    console.log(`[Trend] Scanning ML: "${query}" for ${category}`);

    try {
      const result = await fetchMLProduct(query);
      if (!result) continue;

      const price = parsePriceFromML(result.price);
      const signal: TrendSignal = {
        product: result.title,
        category,
        source: 'mercadolivre',
        score: 0,
        volume: 'alto',
        competition: 'media',
        reason: `Mercado Livre best-seller in ${category}`,
      };

      if (price !== null) {
        signal.score = priceRangeScore(price);
      }

      signal.score += 30;
      signal.score = scoreTrend(signal);
      signals.push(signal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Trend] ML scan failed for ${category}: ${msg}`);
    }
  }

  return signals;
}

export async function scanAIDiscovery(): Promise<TrendSignal[]> {
  const prompt =
    'List the top 5 most trending tech products in Brazil in the last 7 days that would make good YouTube review videos. ' +
    'Include product name, category, and why it\'s trending. ' +
    'Response must be a JSON array of objects with keys: product, category, reason, competition (one of: baixa, media, alta).';

  console.log('[Trend] Running AI discovery scan...');

  try {
    const response = await generateText({
      prompt,
      responseJson: true,
      temperature: 0.6,
      maxOutputTokens: 2000,
    });

    const parsed = JSON.parse(response);
    const items: Array<{
      product?: string;
      category?: string;
      reason?: string;
      competition?: string;
    }> = Array.isArray(parsed) ? parsed : parsed?.products ?? parsed?.trends ?? [];

    return items
      .filter((item) => item.product && item.category)
      .map((item) => ({
        product: item.product!,
        category: item.category!,
        source: 'ai' as const,
        score: 0,
        competition: item.competition || 'media',
        reason: item.reason || 'AI-detected trending product',
      }))
      .map((signal) => {
        signal.score = scoreTrend(signal);
        return signal;
      });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Trend] AI discovery failed: ${msg}`);
    return [];
  }
}

function normalizeProduct(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function isDuplicate(product: string, existingReviews: LightweightReview[]): boolean {
  const normalized = normalizeProduct(product);
  return existingReviews.some((r) => {
    const existingNorm = normalizeProduct(r.product);
    return (
      existingNorm === normalized ||
      normalized.includes(existingNorm) ||
      existingNorm.includes(normalized)
    );
  });
}

function deduplicateSignals(signals: TrendSignal[]): TrendSignal[] {
  const seen = new Map<string, TrendSignal>();

  for (const signal of signals) {
    const key = normalizeProduct(signal.product);
    const existing = seen.get(key);
    if (!existing || signal.score > existing.score) {
      seen.set(key, signal);
    }
  }

  return Array.from(seen.values());
}

export async function scanTrendingProducts(
  options?: { categories?: string[]; maxResults?: number }
): Promise<ScanResult> {
  const maxResults = options?.maxResults ?? 20;
  const sourcesChecked: string[] = [];

  console.log('[Trend] Starting trend scan...');

  const [mlSignals, aiSignals] = await Promise.all([
    scanMercadoLivreTrending().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Trend] ML scan error: ${msg}`);
      return [] as TrendSignal[];
    }),
    scanAIDiscovery().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Trend] AI scan error: ${msg}`);
      return [] as TrendSignal[];
    }),
  ]);

  if (mlSignals.length > 0) sourcesChecked.push('mercadolivre');
  if (aiSignals.length > 0) sourcesChecked.push('ai');

  const allSignals = [...mlSignals, ...aiSignals];
  const deduped = deduplicateSignals(allSignals);

  let existingReviews: LightweightReview[] = [];
  try {
    existingReviews = await getLightweightReviews();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Trend] Failed to fetch existing reviews: ${msg}`);
  }

  const newProducts: TrendSignal[] = [];
  let newCount = 0;

  for (const signal of deduped) {
    if (!isDuplicate(signal.product, existingReviews)) {
      newProducts.push(signal);
      newCount++;
    }
  }

  const sorted = [...newProducts].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, maxResults);

  console.log(`[Trend] Scan complete: ${top.length} trends, ${newCount} new products`);

  return {
    trends: top,
    scannedAt: new Date().toISOString(),
    sourcesChecked,
    newProducts: newCount,
  };
}
