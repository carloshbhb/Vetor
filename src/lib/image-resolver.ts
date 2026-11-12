import { getSupabaseServiceKeyClient } from './supabase';

const IMAGE_PLACEHOLDER = '/images/placeholder.svg';
const IMAGE_CACHE = new Map<string, string>();
const PRODUCT_VARIANTS = new Set(['fe', 'ultra', 'plus', 'pro', 'max', 'mini', 'lite', 'se', 'neo']);
const IGNORED_TOKENS = new Set([
  'samsung', 'apple', 'google', 'motorola', 'smartphone', 'celular', 'telefone',
  'novo', 'original', 'dual', 'sim', '5g', '4g', 'ram', 'gb', 'rom', 'storage',
  'azul', 'preto', 'branco', 'cinza', 'verde', 'rosa', 'roxo', 'creme', 'bege',
  'grafite', 'marinho', '256gb', '128gb', '64gb', '512gb', '1tb', '4gb', '8gb',
]);

function normalizedTokens(value: string): string[] {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter((token) => token && !IGNORED_TOKENS.has(token) && !/^\d+(gb|tb)$/.test(token));
}

function matchesProductName(requestedName: string, candidateName: string): boolean {
  const requested = normalizedTokens(requestedName);
  const candidate = new Set(normalizedTokens(candidateName));
  if (requested.length < 2 || !requested.every((token) => candidate.has(token))) return false;
  const requestedVariants = new Set(requested.filter((token) => PRODUCT_VARIANTS.has(token)));
  return normalizedTokens(candidateName)
    .filter((token) => PRODUCT_VARIANTS.has(token))
    .every((variant) => requestedVariants.has(variant));
}

function isProductImageUrl(value: string | null | undefined): value is string {
  if (!value || !value.trim() || /placeholder\.svg|(?:^|\/)og\.png(?:[?#]|$)/i.test(value.trim())) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function isReachableImage(url: string): Promise<boolean> {
  try {
    let response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(7_000), cache: 'no-store' });
    let contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.toLowerCase().startsWith('image/')) {
      response = await fetch(url, {
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(7_000),
        cache: 'no-store',
      });
      contentType = response.headers.get('content-type') || '';
    }
    return response.ok && contentType.toLowerCase().startsWith('image/');
  } catch {
    return false;
  }
}

function searchNeedle(productName: string): string {
  return normalizedTokens(productName).slice(-2).join(' ');
}

async function findDatabaseImage(productName: string): Promise<string | null> {
  const supabase = getSupabaseServiceKeyClient();
  const needle = searchNeedle(productName);
  if (!supabase || !needle) return null;
  const pattern = `%${needle}%`;
  const lookups = await Promise.allSettled([
    supabase.from('ml_social_list_items').select('title,image_url')
      .ilike('title', pattern).order('last_seen_at', { ascending: false }).limit(30),
    supabase.from('product_links').select('product_name,image_url')
      .ilike('product_name', pattern).limit(30),
    supabase.from('affiliate_links').select('name,image_url')
      .ilike('name', pattern).limit(30),
  ]);
  const candidates: Array<{ imageUrl: string }> = [];
  for (const lookup of lookups) {
    if (lookup.status !== 'fulfilled' || lookup.value.error) continue;
    for (const rawRow of lookup.value.data || []) {
      const row = rawRow as { title?: string; product_name?: string; name?: string; image_url?: string };
      const name = String(row.title || row.product_name || row.name || '');
      const imageUrl = String(row.image_url || '');
      if (matchesProductName(productName, name) && isProductImageUrl(imageUrl)) candidates.push({ imageUrl });
    }
  }
  for (const candidate of candidates) {
    if (await isReachableImage(candidate.imageUrl)) return candidate.imageUrl;
  }
  return null;
}

async function findMercadoLivreImage(productName: string): Promise<string | null> {
  if (!productName.trim()) return null;
  try {
    const url = new URL('https://api.mercadolibre.com/sites/MLB/search');
    url.searchParams.set('q', productName);
    url.searchParams.set('limit', '20');
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9_000),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json() as {
      results?: Array<{ title?: string; thumbnail?: string; secure_thumbnail?: string }>;
    };
    for (const item of payload.results || []) {
      if (!matchesProductName(productName, item.title || '')) continue;
      const imageUrl = String(item.secure_thumbnail || item.thumbnail || '')
        .replace(/^http:/i, 'https:').replace(/-I\./i, '-O.');
      if (isProductImageUrl(imageUrl) && await isReachableImage(imageUrl)) return imageUrl;
    }
  } catch (error) {
    console.warn('[image-resolver] Mercado Livre image search unavailable:', error instanceof Error ? error.message : String(error));
  }
  return null;
}

/** Resolve real product photos from the supplied URL, Vetor's catalogs, or Mercado Livre.
 * A placeholder is only a failure value: the publication quality gate rejects it.
 */
export async function resolveProductImage(url: string, productName = ''): Promise<string> {
  const cacheKey = `${productName.toLowerCase()}|${url}`;
  const cached = IMAGE_CACHE.get(cacheKey);
  if (cached) return cached;
  if (isProductImageUrl(url) && await isReachableImage(url)) {
    IMAGE_CACHE.set(cacheKey, url);
    return url;
  }
  if (productName.trim()) {
    const catalogImage = await findDatabaseImage(productName);
    if (catalogImage) {
      IMAGE_CACHE.set(cacheKey, catalogImage);
      return catalogImage;
    }
    const marketplaceImage = await findMercadoLivreImage(productName);
    if (marketplaceImage) {
      IMAGE_CACHE.set(cacheKey, marketplaceImage);
      return marketplaceImage;
    }
  }
  console.warn(`[image-resolver] No verified product image found for "${productName || url}".`);
  IMAGE_CACHE.set(cacheKey, IMAGE_PLACEHOLDER);
  return IMAGE_PLACEHOLDER;
}

export async function resolveProductImages(
  products: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>
): Promise<Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>> {
  return Promise.all(products.map(async (product) => ({
    ...product,
    imageUrl: await resolveProductImage(product.imageUrl, product.name),
  })));
}
