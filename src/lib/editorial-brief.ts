import { getSupabaseServiceKeyClient } from './supabase';
import {
  buildDefaultComparativeEditorialBrief,
  buildDefaultReviewEditorialBrief,
  type EditorialBrief,
} from './prompt';

interface KeywordRow {
  keyword: string;
  intent?: string | null;
  source?: string | null;
  opportunity_score?: number | null;
  vetor_fit_score?: number | null;
  current_impressions?: number | null;
  current_clicks?: number | null;
  current_ctr?: number | null;
  current_position?: number | null;
  metadata?: Record<string, unknown> | string | null;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function meaningfulTokens(value: string): string[] {
  const stopWords = new Set(['com', 'para', 'por', 'uma', 'uns', 'das', 'dos', 'the', 'vs', 'ou', 'qual', 'como', 'vale', 'pena', 'review', 'preco', 'melhor', 'melhores', '2026']);
  return normalize(value).split(/\s+/).filter((token) => token.length > 1 && !stopWords.has(token));
}

function parseMetadata(value: KeywordRow['metadata']): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { /* metadata is optional */ }
  }
  return {};
}

async function getRelevantKeywordRows(input: {
  title: string;
  category: string;
  relatedProductNames?: string[];
}): Promise<Array<{ row: KeywordRow; productOverlap: number }>> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('seo_keywords')
    .select('keyword,intent,source,opportunity_score,vetor_fit_score,current_impressions,current_clicks,current_ctr,current_position,metadata')
    .gte('vetor_fit_score', 60)
    .order('opportunity_score', { ascending: false })
    .limit(250);

  if (error) {
    console.warn('[editorial-brief] Could not read stored SEO opportunities:', error.message);
    return [];
  }

  const productNames = [input.title, ...(input.relatedProductNames || [])].filter(Boolean);
  const productTokenSets = productNames.map((name) => meaningfulTokens(name)).filter((tokens) => tokens.length > 0);
  const categoryTokens = meaningfulTokens(input.category);
  const rows: Array<{ row: KeywordRow; productOverlap: number }> = [];

  for (const raw of (data || []) as KeywordRow[]) {
    if (!raw || typeof raw.keyword !== 'string' || !raw.keyword.trim()) continue;
    const keywordText = normalize(raw.keyword);
    const keywordTokens = new Set(keywordText.split(/\s+/));
    const productOverlap = Math.max(0, ...productTokenSets.map((tokens) => tokens.filter((token) => keywordTokens.has(token)).length));
    const productMatched = productTokenSets.some((tokens) => {
      const overlap = tokens.filter((token) => keywordTokens.has(token));
      const modelTokens = tokens.filter((token) => /\d/.test(token));
      const required = Math.min(2, tokens.length);
      // If the product/model contains digits, require at least one model token as
      // well as enough name overlap. This prevents Galaxy S24 keywords from being
      // attached to the Galaxy Fit3 review just because both contain Samsung/Galaxy.
      return overlap.length >= required &&
        (modelTokens.length === 0 || modelTokens.some((token) => keywordTokens.has(token)));
    });
    const categoryMatched = categoryTokens.some((token) => keywordTokens.has(token));
    const categoryIntent = /\b(melhor|melhores|comparativo|comparar|preco|comprar|vale a pena|review|analise)\b/.test(keywordText);
    if (productMatched || (categoryMatched && categoryIntent)) rows.push({ row: raw, productOverlap });
  }

  return rows.sort((a, b) => {
    if (b.productOverlap !== a.productOverlap) return b.productOverlap - a.productOverlap;
    return Number(b.row.opportunity_score || 0) - Number(a.row.opportunity_score || 0);
  }).slice(0, 12);
}

function evidenceFromRow(row: KeywordRow) {
  const metadata = parseMetadata(row.metadata);
  const sources = Array.isArray(metadata.sources)
    ? metadata.sources.filter((source): source is string => typeof source === 'string')
    : typeof row.source === 'string' && row.source ? [row.source] : [];
  const period = metadata.period;
  return {
    keyword: row.keyword,
    impressions: row.current_impressions == null || !Number.isFinite(Number(row.current_impressions)) ? undefined : Number(row.current_impressions),
    clicks: row.current_clicks == null || !Number.isFinite(Number(row.current_clicks)) ? undefined : Number(row.current_clicks),
    ctr: row.current_ctr == null || !Number.isFinite(Number(row.current_ctr)) ? undefined : Number(row.current_ctr),
    position: row.current_position == null || !Number.isFinite(Number(row.current_position)) ? null : Number(row.current_position),
    opportunityScore: row.opportunity_score == null || !Number.isFinite(Number(row.opportunity_score)) ? undefined : Number(row.opportunity_score),
    sources,
    ...(period ? { period: typeof period === 'string' ? period : JSON.stringify(period) } : {}),
  };
}

function enrichBrief(defaultBrief: EditorialBrief, rows: Array<{ row: KeywordRow; productOverlap: number }>): EditorialBrief {
  if (!rows.length) return defaultBrief;
  const primaryRow = rows.find((item) => item.productOverlap > 0)?.row || rows[0].row;
  const related = rows.map((item) => item.row.keyword).filter((keyword) => normalize(keyword) !== normalize(primaryRow.keyword));
  const normalizedIntent = normalize(primaryRow.intent || '');
  const searchIntent: EditorialBrief['searchIntent'] =
    normalizedIntent.includes('transacional') || normalizedIntent.includes('transactional')
      ? 'transactional'
      : normalizedIntent.includes('informacional') || normalizedIntent.includes('informational')
        ? 'informational'
        : normalizedIntent.includes('navegacional') || normalizedIntent.includes('navigational')
          ? 'navigational'
          : 'commercial';
  return {
    ...defaultBrief,
    searchIntent,
    primaryKeyword: primaryRow.keyword,
    relatedKeywords: Array.from(new Set([...related, ...(defaultBrief.relatedKeywords || [])])).slice(0, 10),
    keywordEvidence: rows.map((item) => evidenceFromRow(item.row)),
  };
}

export async function buildReviewEditorialBrief(input: { title: string; category: string }): Promise<EditorialBrief> {
  const fallback = buildDefaultReviewEditorialBrief(input);
  return enrichBrief(fallback, await getRelevantKeywordRows(input));
}

export async function buildComparativeEditorialBrief(input: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string }>;
}): Promise<EditorialBrief> {
  const fallback = buildDefaultComparativeEditorialBrief(input);
  const rows = await getRelevantKeywordRows({
    title: input.title,
    category: input.category,
    relatedProductNames: input.comparisonProducts.map((product) => product.name),
  });
  return enrichBrief(fallback, rows);
}
