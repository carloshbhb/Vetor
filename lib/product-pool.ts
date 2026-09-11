import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { getLightweightReviews } from './db';
import type { ValidatedKeyword } from './keyword-validator';

export interface PoolProduct {
  id: string;
  product: string;
  category: string;
  keywordScore: number;
  searchVolume?: string;
  seoDifficulty?: string;
  trendSource?: string;
  priority: number;
  status: 'pending' | 'processing' | 'reviewed' | 'skipped';
  addedAt: string;
  processedAt?: string;
}

export interface PoolStats {
  total: number;
  pending: number;
  processing: number;
  reviewed: number;
  skipped: number;
  byCategory: Record<string, number>;
  avgPriority: number;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const FALLBACK_PATH = path.join(process.cwd(), 'data', 'product-pool.json');

function readFallback(): PoolProduct[] {
  try {
    if (!fs.existsSync(FALLBACK_PATH)) return [];
    return JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeFallback(products: PoolProduct[]) {
  fs.writeFileSync(FALLBACK_PATH, JSON.stringify(products, null, 2));
}

function normalizeProduct(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function computePriority(keyword: ValidatedKeyword): number {
  const volumeBonus =
    keyword.searchVolume === 'alto'
      ? 20
      : keyword.searchVolume === 'medio'
        ? 10
        : 0;
  const difficultyBonus =
    keyword.seoDifficulty === 'baixa'
      ? 15
      : keyword.seoDifficulty === 'media'
        ? 5
        : 0;
  return Math.round(keyword.keywordScore * 0.6 + volumeBonus + difficultyBonus);
}

export { computePriority };

export async function updateProductPool(
  validated: ValidatedKeyword[],
): Promise<{ added: number; removed: number; poolSize: number }> {
  const sb = supabaseAdmin();

  const existingReviews = await getLightweightReviews();
  const existingReviewProducts = new Set(
    existingReviews.map((r) => normalizeProduct(r.product)),
  );

  let existingPool: PoolProduct[] = [];
  if (sb) {
    const { data } = await sb
      .from('product_pool')
      .select('*')
      .order('priority', { ascending: false });
    existingPool = (data || []) as PoolProduct[];
  } else {
    existingPool = readFallback();
  }

  const existingPoolProducts = new Set(
    existingPool.map((p) => normalizeProduct(p.product)),
  );

  let added = 0;
  const toInsert: PoolProduct[] = [];

  for (const kw of validated) {
    const normalized = normalizeProduct(kw.product);
    if (existingPoolProducts.has(normalized) || existingReviewProducts.has(normalized)) {
      continue;
    }
    const priority = computePriority(kw);
    const product: PoolProduct = {
      id: crypto.randomUUID(),
      product: kw.product,
      category: kw.category,
      keywordScore: kw.keywordScore,
      searchVolume: kw.searchVolume,
      seoDifficulty: kw.seoDifficulty,
      priority,
      status: 'pending',
      addedAt: new Date().toISOString(),
    };
    toInsert.push(product);
    existingPoolProducts.add(normalized);
    added++;
  }

  const reviewedProducts = existingPool.filter((p) => p.status === 'reviewed');
  let removed = 0;
  const poolAfterAdds = [...existingPool];

  for (const reviewed of reviewedProducts) {
    const idx = poolAfterAdds.findIndex(
      (p) => normalizeProduct(p.product) === normalizeProduct(reviewed.product),
    );
    if (idx >= 0) {
      poolAfterAdds.splice(idx, 1);
      removed++;
    }
  }

  if (sb) {
    if (toInsert.length > 0) {
      await sb.from('product_pool').insert(
        toInsert.map((p) => ({
          id: p.id,
          product: p.product,
          category: p.category,
          keyword_score: p.keywordScore,
          search_volume: p.searchVolume,
          seo_difficulty: p.seoDifficulty,
          trend_source: p.trendSource,
          priority: p.priority,
          status: p.status,
          added_at: p.addedAt,
          processed_at: p.processedAt,
        })),
      );
    }
    if (removed > 0) {
      const idsToRemove = reviewedProducts.map((p) => p.id);
      await sb.from('product_pool').delete().in('id', idsToRemove);
    }
  } else {
    const final = [...poolAfterAdds, ...toInsert];
    writeFallback(final);
  }

  const poolSize = poolAfterAdds.length + toInsert.length;
  console.log(`[product-pool] updateProductPool: added=${added}, removed=${removed}, poolSize=${poolSize}`);
  return { added, removed, poolSize };
}

export async function getTopProducts(limit = 10): Promise<PoolProduct[]> {
  const sb = supabaseAdmin();
  if (!sb) {
    return readFallback()
      .filter((p) => p.status === 'pending')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }
  const { data } = await sb
    .from('product_pool')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(limit);
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    product: row.product as string,
    category: row.category as string,
    keywordScore: row.keyword_score as number,
    searchVolume: row.search_volume as string | undefined,
    seoDifficulty: row.seo_difficulty as string | undefined,
    trendSource: row.trend_source as string | undefined,
    priority: row.priority as number,
    status: row.status as PoolProduct['status'],
    addedAt: row.added_at as string,
    processedAt: row.processed_at as string | undefined,
  }));
}

export async function claimProduct(product: string): Promise<PoolProduct | null> {
  const sb = supabaseAdmin();
  const normalized = normalizeProduct(product);

  if (!sb) {
    const all = readFallback();
    const idx = all.findIndex(
      (p) => normalizeProduct(p.product) === normalized && p.status === 'pending',
    );
    if (idx < 0) return null;
    all[idx] = {
      ...all[idx],
      status: 'processing',
      processedAt: new Date().toISOString(),
    };
    writeFallback(all);
    return all[idx];
  }

  const { data: existing } = await sb
    .from('product_pool')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(100);

  const match = (existing || []).find(
    (row: Record<string, unknown>) =>
      normalizeProduct(row.product as string) === normalized,
  );
  if (!match) return null;

  await sb
    .from('product_pool')
    .update({
      status: 'processing',
      processed_at: new Date().toISOString(),
    })
    .eq('id', match.id);

  return {
    id: match.id as string,
    product: match.product as string,
    category: match.category as string,
    keywordScore: match.keyword_score as number,
    searchVolume: match.search_volume as string | undefined,
    seoDifficulty: match.seo_difficulty as string | undefined,
    trendSource: match.trend_source as string | undefined,
    priority: match.priority as number,
    status: 'processing',
    addedAt: match.added_at as string,
    processedAt: new Date().toISOString(),
  };
}

export async function markProductReviewed(product: string): Promise<void> {
  const sb = supabaseAdmin();
  const normalized = normalizeProduct(product);
  const now = new Date().toISOString();

  if (!sb) {
    const all = readFallback();
    const idx = all.findIndex(
      (p) => normalizeProduct(p.product) === normalized,
    );
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: 'reviewed', processedAt: now };
      writeFallback(all);
    }
    return;
  }

  await sb
    .from('product_pool')
    .update({ status: 'reviewed', processed_at: now })
    .eq('product', product);
}

export async function markProductSkipped(
  product: string,
  _reason?: string,
): Promise<void> {
  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  if (!sb) {
    const all = readFallback();
    const idx = all.findIndex(
      (p) => normalizeProduct(p.product) === normalizeProduct(product),
    );
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: 'skipped', processedAt: now };
      writeFallback(all);
    }
    return;
  }

  await sb
    .from('product_pool')
    .update({ status: 'skipped', processed_at: now })
    .eq('product', product);
}

export async function getPoolStats(): Promise<PoolStats> {
  const sb = supabaseAdmin();
  let products: PoolProduct[] = [];

  if (sb) {
    const { data } = await sb.from('product_pool').select('*');
    products = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      product: row.product as string,
      category: row.category as string,
      keywordScore: row.keyword_score as number,
      searchVolume: row.search_volume as string | undefined,
      seoDifficulty: row.seo_difficulty as string | undefined,
      trendSource: row.trend_source as string | undefined,
      priority: row.priority as number,
      status: row.status as PoolProduct['status'],
      addedAt: row.added_at as string,
      processedAt: row.processed_at as string | undefined,
    }));
  } else {
    products = readFallback();
  }

  const total = products.length;
  const pending = products.filter((p) => p.status === 'pending').length;
  const processing = products.filter((p) => p.status === 'processing').length;
  const reviewed = products.filter((p) => p.status === 'reviewed').length;
  const skipped = products.filter((p) => p.status === 'skipped').length;

  const byCategory: Record<string, number> = {};
  for (const p of products) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }

  const avgPriority =
    total > 0
      ? Math.round(
          (products.reduce((acc, p) => acc + p.priority, 0) / total) * 10,
        ) / 10
      : 0;

  return { total, pending, processing, reviewed, skipped, byCategory, avgPriority };
}

export async function cleanPool(): Promise<{ removed: number }> {
  const sb = supabaseAdmin();
  const now = new Date();
  let removed = 0;

  if (!sb) {
    const all = readFallback();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const filtered = all.filter((p) => {
      if (p.status === 'reviewed' && p.processedAt) {
        if (new Date(p.processedAt) < thirtyDaysAgo) {
          removed++;
          return false;
        }
      }
      if (p.status === 'skipped' && p.processedAt) {
        if (new Date(p.processedAt) < sevenDaysAgo) {
          removed++;
          return false;
        }
      }
      return true;
    });

    writeFallback(filtered);
    console.log(`[product-pool] cleanPool: removed=${removed}`);
    return { removed };
  }

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: reviewedOld } = await sb
    .from('product_pool')
    .select('id')
    .eq('status', 'reviewed')
    .lt('processed_at', thirtyDaysAgo);
  if (reviewedOld?.length) {
    await sb.from('product_pool').delete().in('id', reviewedOld.map((r) => r.id));
    removed += reviewedOld.length;
  }

  const { data: skippedOld } = await sb
    .from('product_pool')
    .select('id')
    .eq('status', 'skipped')
    .lt('processed_at', sevenDaysAgo);
  if (skippedOld?.length) {
    await sb.from('product_pool').delete().in('id', skippedOld.map((r) => r.id));
    removed += skippedOld.length;
  }

  console.log(`[product-pool] cleanPool: removed=${removed}`);
  return { removed };
}