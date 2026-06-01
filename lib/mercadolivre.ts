// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Mercado Livre API Client
// Integrates with the public ML API to extract product title, price,
// high-resolution images and generate parametrized affiliate URLs.
// ─────────────────────────────────────────────────────────────────────────────

const ML_API_BASE = 'https://api.mercadolibre.com';
const ML_SITE = 'MLB'; // Brazil

export interface MLProduct {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;        // highest-resolution picture available
  permalink: string;       // canonical product URL on ML
  affiliateUrl: string;    // link parametrized with publisher tag
  currency: string;        // BRL
  condition: string;       // new | used
  seller?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detects whether a string is a Mercado Livre item ID (MLB followed by digits).
 */
export function isMLBItemId(input: string): boolean {
  return /^MLB[-]?\d+$/i.test(input.trim());
}

/**
 * Extracts an MLB item ID from a full Mercado Livre product URL.
 * Supports formats like:
 *   https://produto.mercadolivre.com.br/MLB-123456789-...
 *   https://www.mercadolivre.com.br/p/MLB123456789
 *   https://mercadolivre.com.br/MLB-123456789
 */
export function extractMLIdFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/MLB[-]?(\d{7,12})/i);
  return match ? `MLB${match[1]}` : null;
}

/**
 * Builds a parametrized affiliate URL for Mercado Livre.
 * Uses ML_PUBLISHER_ID env variable when available; otherwise appends
 * a generic ref tag for basic tracking.
 * 
 * Supports two formats:
 * - Short: https://meli.la/{shortId} (preferred for ML affiliate program)
 * - Long: https://lista.mercadolivre.com.br/{query}?matt_tool={id}&...
 */
export function buildAffiliateUrl(permalink: string, publisherId?: string): string {
  const pid = publisherId || process.env.ML_PUBLISHER_ID;
  
  // If the URL is already a meli.la short link, return as-is
  if (permalink.includes('meli.la/')) {
    return permalink;
  }

  try {
    const url = new URL(permalink);
    if (pid) {
      // Use affiliate parameters for ML affiliate program
      url.searchParams.set('matt_tool', pid);
      url.searchParams.set('matt_word', 'vetorblog');
      url.searchParams.set('ref', pid);
      url.searchParams.set('tracking_id', pid);
    } else {
      url.searchParams.set('ref', 'vetorblog');
    }
    return url.toString();
  } catch {
    // If URL parsing fails, append manually
    const sep = permalink.includes('?') ? '&' : '?';
    if (pid) {
      return `${permalink}${sep}matt_tool=${pid}&matt_word=vetorblog&ref=${pid}&tracking_id=${pid}`;
    }
    return `${permalink}${sep}ref=vetorblog`;
  }
}

/**
 * Creates a meli.la short affiliate link from a product permalink.
 * This is the preferred format for ML affiliate tracking.
 */
export async function createMeliLaLink(permalink: string, publisherId?: string): Promise<string> {
  const pid = publisherId || process.env.ML_PUBLISHER_ID;
  
  if (!pid) {
    console.warn('[ML] No ML_PUBLISHER_ID configured, using long URL');
    return buildAffiliateUrl(permalink, pid);
  }

  // Build the affiliate URL with tracking parameters
  const affiliateUrl = buildAffiliateUrl(permalink, pid);
  
  // For now, return the long URL with affiliate parameters
  // The meli.la short links are typically created through ML's affiliate dashboard
  // or API. To use short links, create them manually in the ML affiliate panel.
  console.log(`[ML] Affiliate URL: ${affiliateUrl}`);
  return affiliateUrl;
}

/**
 * Scrapes product image from Bing image search for Mercado Livre products.
 */
async function scrapeProductImage(query: string): Promise<string> {
  try {
    // Search Bing for ML product images
    const searchQuery = `${query} Mercado Livre`;
    const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&form=HDRSC3`;
    console.log(`[ML Scrape] Searching Bing: ${bingUrl}`);

    const bingRes = await fetch(bingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!bingRes.ok) {
      console.warn(`[ML Scrape] Bing search failed: ${bingRes.status}`);
      return '';
    }

    const html = await bingRes.text();

    // Find first ML product image
    const imageMatch = html.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"]+\.webp/);
    if (imageMatch) {
      const imageUrl = imageMatch[0];
      console.log(`[ML Scrape] Found image: ${imageUrl}`);
      return imageUrl;
    }

    console.warn('[ML Scrape] No ML image found in Bing results');
    return '';
  } catch (err: any) {
    console.warn(`[ML Scrape] Error: ${err.message}`);
    return '';
  }
}

/**
 * Picks the best available image from the ML pictures array.
 * Prefers the highest-resolution variant (O = original).
 */
function pickBestImage(pictures: any[]): string {
  if (!pictures || pictures.length === 0) return '';

  // ML provides size variants: O (original), F, D, G, C, B, etc.
  // The secure_url usually has the largest variant embedded.
  const first = pictures[0];

  // Try to get the "-O.webp" (original) variant
  if (first.secure_url) {
    // Replace size suffix with -O (original high-res)
    const highRes = first.secure_url.replace(/-[A-Z]\.(webp|jpg|jpeg|png)$/i, '-O.webp');
    console.log(`[ML API] High-res image: ${highRes}`);
    return highRes;
  }

  if (first.url) {
    // Try to convert HTTP to HTTPS and get high-res
    let url = first.url.replace(/-[A-Z]\.(webp|jpg|jpeg|png)$/i, '-O.webp');
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    return url;
  }

  return '';
}

/**
 * Formats a numeric price (e.g. 249.9) into Brazilian Real format (R$ 249,90).
 */
function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Core Fetchers ───────────────────────────────────────────────────────────

/**
 * Fetches a single product by its MLB item ID.
 * Endpoint: GET /items/{id}
 */
async function fetchByItemId(itemId: string): Promise<MLProduct | null> {
  const normalizedId = itemId.replace('-', '').toUpperCase(); // MLB123456789
  const url = `${ML_API_BASE}/items/${normalizedId}`;

  const accessToken = process.env.ML_ACCESS_TOKEN;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'VetorBlog/1.0',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.warn('[ML API] ML_ACCESS_TOKEN not configured. Using placeholder image.');
    return null;
  }

  const res = await fetch(url, { headers, next: { revalidate: 300 } });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.warn(`[ML API] GET /items/${normalizedId} returned ${res.status}: ${errorText}`);
    return null;
  }

  const item = await res.json();
  console.log(`[ML API] Item found: ${item.title} (${item.id})`);

  const imageUrl = pickBestImage(item.pictures || []);

  return {
    id: item.id,
    title: item.title,
    price: item.price,
    originalPrice: item.original_price ?? null,
    imageUrl,
    permalink: item.permalink,
    affiliateUrl: buildAffiliateUrl(item.permalink),
    currency: item.currency_id || 'BRL',
    condition: item.condition || 'new',
  };
}

/**
 * Searches products by free text query and returns the best match.
 * Endpoint: GET /sites/MLB/search?q={query}&limit=5
 */
async function fetchBySearch(query: string): Promise<MLProduct | null> {
  const encodedQuery = encodeURIComponent(query);
  const url = `${ML_API_BASE}/sites/${ML_SITE}/search?q=${encodedQuery}&limit=5`;

  const accessToken = process.env.ML_ACCESS_TOKEN;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'VetorBlog/1.0',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.warn('[ML API] ML_ACCESS_TOKEN not configured. Using placeholder image.');
    return null;
  }

  console.log(`[ML API] Searching: ${url}`);

  const res = await fetch(url, { headers, next: { revalidate: 300 } });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.warn(`[ML API] GET /search?q=${query} returned ${res.status}: ${errorText}`);
    return null;
  }

  const data = await res.json();
  const results: any[] = data.results || [];

  console.log(`[ML API] Search returned ${results.length} results`);

  if (results.length === 0) return null;

  // Score-based matching: prefer items with title overlap + new condition
  const cleanQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 2);

  let bestResult = results[0];
  let bestScore = 0;

  for (const item of results) {
    const cleanTitle = (item.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let score = 0;
    for (const word of queryWords) {
      if (cleanTitle.includes(word)) score++;
    }
    if (item.condition === 'new') score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestResult = item;
    }
  }

  // For the search results, thumbnail is available but we need to fetch item details
  // to get the full pictures array with high-res variants.
  // We attempt a secondary fetch for the best match item.
  try {
    const detailedProduct = await fetchByItemId(bestResult.id);
    if (detailedProduct) return detailedProduct;
  } catch (err: any) {
    console.warn(`[ML API] Secondary fetch failed for ${bestResult.id}: ${err.message}`);
  }

  // Fallback: use search result thumbnail directly
  // Convert thumbnail to higher resolution: replace -C.jpg with -O.webp
  let thumbnail = bestResult.thumbnail || '';
  if (thumbnail) {
    // Try to get original high-res version
    thumbnail = thumbnail.replace(/-[A-Z]\.(jpg|jpeg|png)$/i, '-O.webp');
    // Ensure HTTPS
    if (thumbnail.startsWith('http://')) {
      thumbnail = thumbnail.replace('http://', 'https://');
    }
  }

  console.log(`[ML API] Using thumbnail: ${thumbnail}`);

  return {
    id: bestResult.id,
    title: bestResult.title,
    price: bestResult.price,
    originalPrice: bestResult.original_price ?? null,
    imageUrl: thumbnail || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
    permalink: bestResult.permalink,
    affiliateUrl: buildAffiliateUrl(bestResult.permalink),
    currency: bestResult.currency_id || 'BRL',
    condition: bestResult.condition || 'new',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface MLEnrichResult {
  title: string;
  price: string;        // formatted: "R$ 249,90"
  priceOld: string;     // formatted: "R$ 299,90" (or estimated +15%)
  imageUrl: string;
  affiliateUrl: string;
  source: 'ML API (Item ID)' | 'ML API (Search)' | 'Not Found';
}

/**
 * Main entry point. Accepts either:
 *   - An MLB item ID (e.g. "MLB3756489234" or "MLB-3756489234")
 *   - A full ML product URL (the MLB ID is extracted automatically)
 *   - A free-text product query (e.g. "Samsung Galaxy Fit3")
 *
 * Returns normalized product data with formatted prices and affiliate URL.
 * Returns null if no product could be found.
 */
export async function fetchMLProduct(
  idOrQuery: string,
): Promise<MLEnrichResult | null> {
  if (!idOrQuery?.trim()) return null;

  // Try API first if token is configured
  if (process.env.ML_ACCESS_TOKEN) {
    let product: MLProduct | null = null;
    let source: MLEnrichResult['source'] = 'Not Found';

    // 1. Check if input is a URL containing an MLB ID
    const extractedId = extractMLIdFromUrl(idOrQuery);
    if (extractedId) {
      console.log(`[ML API] Fetching by extracted Item ID: ${extractedId}`);
      product = await fetchByItemId(extractedId);
      if (product) source = 'ML API (Item ID)';
    }

    // 2. Check if input is a raw MLB ID
    if (!product && isMLBItemId(idOrQuery)) {
      console.log(`[ML API] Fetching by raw Item ID: ${idOrQuery}`);
      product = await fetchByItemId(idOrQuery);
      if (product) source = 'ML API (Item ID)';
    }

    // 3. Fall back to text search
    if (!product) {
      console.log(`[ML API] Fetching by search query: "${idOrQuery}"`);
      product = await fetchBySearch(idOrQuery);
      if (product) source = 'ML API (Search)';
    }

    if (product) {
      let priceOld: string;
      if (product.originalPrice && product.originalPrice > product.price) {
        priceOld = formatBRL(product.originalPrice);
      } else {
        priceOld = formatBRL(product.price * 1.15);
      }

      return {
        title: product.title,
        price: formatBRL(product.price),
        priceOld,
        imageUrl: product.imageUrl,
        affiliateUrl: product.affiliateUrl,
        source,
      };
    }
  }

  // Fallback: scrape image from product page
  console.log(`[ML Scrape] Falling back to web scraping for: "${idOrQuery}"`);
  const scrapedImage = await scrapeProductImage(idOrQuery);
  
  if (scrapedImage) {
    // Build affiliate URL
    const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(idOrQuery)}`;
    const affiliateUrl = buildAffiliateUrl(searchUrl);

    return {
      title: idOrQuery,
      price: '',
      priceOld: '',
      imageUrl: scrapedImage,
      affiliateUrl,
      source: 'ML API (Search)',
    };
  }

  console.warn(`[ML API] No product found for: "${idOrQuery}"`);
  return null;
}
