import {
  markProductLinkReviewed,
  type ProductLink,
} from '../src/lib/product-links';
import { productLinkToPipelineInput, runReviewPipeline } from '../src/lib/content-pipeline';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { slugifyEditorialTitle } from '../src/lib/slug';
import { searchProducts } from '../src/lib/mercadolivre-api';
import { getValidAccessToken } from '../src/lib/mercadolivre-auth';
import { extractProductData } from '../src/lib/product-extractor';

type ExistingReview = {
  slug: string;
  product: string | null;
  status: string | null;
  content_type: string | null;
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function canonicalProductName(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(/^\s*(?:(?:review|an[aá]lise(?:\s+completa)?|avaliação|avaliacao)\s+)+/i, '');
  normalized = normalized.replace(/^\s*(?:notebook|laptop|controle|controlador)\s+/i, '');
  normalized = normalized.replace(/\s*[:–—-]\s*(?:an[aá]lise|review|vale\s+a\s+pena)\b[\s\S]*$/i, '');
  normalized = normalized.replace(/\s+(?:an[aá]lise\s+completa|review|vale\s+a\s+pena)\??\s*$/i, '');
  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const GENERIC_PRODUCT_WORDS = new Set([
  'review', 'analise', 'completa', 'completo', 'avaliacao',
  'notebook', 'laptop', 'controle', 'controlador', 'cor', 'original',
]);

const NUMBERED_PRODUCT_VARIANTS: RegExp[] = [
  /\b(?:galaxy\s+)?buds\s*(\d{1,2})\b/i,
  /\bairpods\s+pro\s*(\d{1,2})\b/i,
  /\b(?:redmi\s+)?watch\s*(\d{1,2})\b/i,
  /\bsmart\s+band\s*(\d{1,2})\b/i,
  /\b(?:echo\s+)?dot\s*(\d{1,2})\b/i,
  /\b(?:jbl\s+)?quantum\s*(\d{2,3})\b/i,
  /\bsuperlight\s*(\d{1,2})\b/i,
  /\bgamesir\s+nova\s+lite\s*(\d{1,2})\b/i,
];

function hasNumberedVariantMismatch(query: string, title: string): boolean {
  const normalizedQuery = canonicalProductName(query);
  const normalizedTitle = canonicalProductName(title);
  for (const pattern of NUMBERED_PRODUCT_VARIANTS) {
    const requested = normalizedQuery.match(pattern)?.[1] || null;
    const existing = normalizedTitle.match(pattern)?.[1] || null;
    if ((requested || existing) && requested !== existing) return true;
  }
  return false;
}

function isSameProductPage(productName: string, page: ExistingReview): boolean {
  if (!page.product?.trim() || page.content_type !== 'review') return false;
  if (hasNumberedVariantMismatch(productName, page.product)) return false;

  const productTokens = canonicalProductName(productName)
    .split(' ')
    .filter((token) => (token.length > 1 || /^\d+$/.test(token)) && !GENERIC_PRODUCT_WORDS.has(token));
  const pageTokens = new Set(
    canonicalProductName(page.product)
      .split(' ')
      .filter((token) => (token.length > 1 || /^\d+$/.test(token)) && !GENERIC_PRODUCT_WORDS.has(token))
  );

  // Compare the request's identifying tokens against the fuller editorial title.
  // Additional confirmed specs are acceptable; missing product tokens are not.
  return productTokens.length >= 2 && productTokens.every((token) => pageTokens.has(token));
}

function isEligibleProduct(link: ProductLink): boolean {
  return Boolean(
    link.id &&
    link.product_name?.trim() &&
    link.status !== 'archived' &&
    link.status !== 'reviewed' &&
    !link.has_review &&
    isHttpUrl(link.product_url) &&
    isHttpUrl(link.affiliate_url) &&
    isHttpUrl(link.image_url) &&
    ['mercadolivre', 'amazon', 'shopee'].includes(String(link.marketplace || '').toLowerCase())
  );
}


type AffiliateMatchSource = {
  affiliate_link_id: string;
  matched_item_id: string | null;
  matched_product_id: string | null;
  matched_title: string | null;
  matched_url: string | null;
  match_score: number | string | null;
  match_status: string | null;
  affiliate_links: {
    id: string;
    name: string;
    category: string | null;
    slug: string | null;
    destination_url: string | null;
    source_type: string | null;
    status: string | null;
    priority: number | null;
  } | null;
};

type DiscoveryResult = {
  candidates: ProductLink[];
  credentialsAvailable: boolean;
  imported: number;
  enriched: number;
  skippedExisting: number;
  skippedUnsafe: number;
  detailErrors: number;
};

function isHttpsUrl(value: unknown): value is string {
  if (!isHttpUrl(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeProductImage(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const hostname = url.hostname.toLowerCase();
    const isMarketplaceImageHost =
      hostname === 'mlstatic.com' || hostname.endsWith('.mlstatic.com') ||
      hostname === 'mlcdn.com' || hostname.endsWith('.mlcdn.com');
    const path = url.pathname.toLowerCase();
    // Mercado Livre listing HTML can expose its site-navigation logo as the first
    // image. Never treat logos, favicons, sprites or interface assets as product photos.
    if (!isMarketplaceImageHost || /frontend-assets\/ui-navigation|logo|favicon|sprite|tracking/.test(path)) {
      return null;
    }

    url.protocol = 'https:';
    return url.toString().replace('-I.jpg', '-O.jpg');
  } catch {
    return null;
  }
}

function inferProductCategory(name: string, title: string, fallback: string | null): string {
  const value = canonicalProductName(name + ' ' + title);
  if (/\b(robot vacuum|robo aspirador|mi robot vacuum)\b/i.test(value)) return 'Robôs Aspiradores';
  if (/\b(redmi note|smartphone|celular|iphone)\b/i.test(value)) return 'Smartphones';
  if (/\b(intelbras im\d+|camera de seguranca|camera wifi)\b/i.test(value)) return 'Câmeras de Segurança';
  if (/\b(m track|m audio|interface de audio|interface audio)\b/i.test(value)) return 'Áudio Profissional';
  if (/\b(notebook|laptop|inspiron|vivobook|ideapad)\b/i.test(value)) return 'Notebooks';
  if (/\b(fritadeira|air fryer|pfr\d+)\b/i.test(value)) return 'Eletroportáteis';
  return String(fallback || '').trim() || 'Geral';
}


type ProductionMLProductDetails = {
  itemId: string;
  title: string;
  productUrl: string;
  price: number | null;
  imageUrl: string | null;
};

async function fetchProductionMLProductDetails(itemId: string, matchedUrl?: string, matchedTitle?: string, catalogProductId?: string | null): Promise<ProductionMLProductDetails> {
  const normalizedItemId = itemId.replace(/-/g, '').toUpperCase();
  const pageUrl = isHttpsUrl(matchedUrl)
    ? matchedUrl
    : 'https://produto.mercadolivre.com.br/MLB-' + normalizedItemId.replace(/^MLB/, '');
  let extractionError = 'extração não identificada';

  // Prefer the catalog-product endpoint when the approved match has a catalog ID.
  // Mercado Livre restricts /items/{id} and /sites/MLB/search for many external apps,
  // but /products/{catalog_product_id} can expose the canonical product pictures.
  const normalizedCatalogId = String(catalogProductId || '').trim().toUpperCase();
  if (/^MLB\\d{5,}$/.test(normalizedCatalogId)) {
    try {
      const accessToken = await getValidAccessToken();
      const catalogResponse = await fetch(
        'https://api.mercadolibre.com/products/' + normalizedCatalogId,
        {
          headers: {
            authorization: 'Bearer ' + accessToken,
            accept: 'application/json',
          },
          signal: AbortSignal.timeout(12_000),
          cache: 'no-store',
        }
      );
      if (!catalogResponse.ok) {
        throw new Error('Detalhes de catálogo Mercado Livre HTTP ' + catalogResponse.status);
      }
      const catalogProduct = await catalogResponse.json() as {
        id?: string;
        name?: string;
        status?: string;
        pictures?: Array<{ id?: string; url?: string; secure_url?: string }>;
      };
      const catalogImage = (catalogProduct.pictures || [])
        .map((picture) => normalizeProductImage(picture.secure_url) || normalizeProductImage(picture.url))
        .find((image): image is string => Boolean(image));
      if (catalogImage && catalogProduct.status !== 'inactive') {
        console.log('[review-generation] recovered verified catalog product image: ' + normalizedCatalogId);
        return {
          itemId: normalizedItemId,
          title: String(catalogProduct.name || matchedTitle || '').trim(),
          productUrl: pageUrl,
          price: null,
          imageUrl: catalogImage,
        };
      }
      throw new Error('O produto de catálogo não possui imagem pública válida ou está inativo.');
    } catch (error) {
      extractionError = error instanceof Error ? error.message.slice(0, 220) : String(error).slice(0, 220);
      console.warn('[review-generation] catalog product fallback failed for ' + normalizedCatalogId + ': ' + extractionError);
    }
  }

  // Try the public site-search endpoint without OAuth next.
  // Accept only an exact item-ID match; never borrow another listing's photo.
  if (matchedTitle?.trim()) {
    try {
      const publicSearchUrl = new URL('https://api.mercadolibre.com/sites/MLB/search');
      publicSearchUrl.searchParams.set('q', matchedTitle.trim());
      publicSearchUrl.searchParams.set('limit', '50');
      publicSearchUrl.searchParams.set('attributes', 'id,title,price,permalink,thumbnail,pictures');
      const publicResponse = await fetch(publicSearchUrl.toString(), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
        cache: 'no-store',
      });
      if (!publicResponse.ok) {
        throw new Error('Busca pública Mercado Livre HTTP ' + publicResponse.status);
      }
      const publicPayload = await publicResponse.json() as {
        results?: Array<{
          id?: string;
          title?: string;
          permalink?: string;
          thumbnail?: string;
          pictures?: Array<{ secure_url?: string; url?: string }>;
        }>;
      };
      const publicExactMatch = (publicPayload.results || []).find((candidate) =>
        String(candidate.id || '').replace(/-/g, '').toUpperCase() === normalizedItemId
      );
      const publicImage = publicExactMatch && (
        normalizeProductImage(publicExactMatch.thumbnail) ||
        normalizeProductImage(publicExactMatch.pictures?.find((picture) => picture.secure_url)?.secure_url) ||
        normalizeProductImage(publicExactMatch.pictures?.[0]?.url)
      );
      if (publicExactMatch && publicImage) {
        console.log('[review-generation] recovered exact item from public Mercado Livre search: ' + normalizedItemId);
        return {
          itemId: normalizedItemId,
          title: String(publicExactMatch.title || matchedTitle).trim(),
          productUrl: String(publicExactMatch.permalink || pageUrl).trim(),
          price: null,
          imageUrl: publicImage,
        };
      }
    } catch (error) {
      extractionError = error instanceof Error ? error.message.slice(0, 220) : String(error).slice(0, 220);
      console.warn('[review-generation] public Mercado Livre search failed for ' + itemId + ': ' + extractionError);
    }
  }

  // Item detail requests can return 403 even when public search results remain
  // available. Search for the exact stored item ID so the thumbnail comes from
  // Mercado Livre itself, not from a guessed URL or a different product.
  if (matchedTitle?.trim()) {
    try {
      const search = await searchProducts(matchedTitle.trim(), { limit: 50 });
      const exactMatch = (search.results || []).find((candidate) =>
        String(candidate.id || '').replace(/-/g, '').toUpperCase() === normalizedItemId
      );
      if (exactMatch) {
        const imageUrl = normalizeProductImage(exactMatch.thumbnail) ||
          normalizeProductImage(exactMatch.pictures?.find((picture) => picture.secure_url)?.secure_url) ||
          normalizeProductImage(exactMatch.pictures?.[0]?.url);
        if (imageUrl) {
          return {
            itemId: normalizedItemId,
            title: String(exactMatch.title || matchedTitle).trim(),
            productUrl: String(exactMatch.permalink || pageUrl).trim(),
            price: null,
            imageUrl,
          };
        }
      }
    } catch (error) {
      extractionError = error instanceof Error ? error.message.slice(0, 220) : String(error).slice(0, 220);
      console.warn('[review-generation] Mercado Livre search fallback failed for ' + itemId + ': ' + extractionError);
    }
  }

  // If the exact item is not returned by search, try the existing extractor;
  // it attempts OAuth and then scrapes the public listing metadata.
  try {
    const extracted = await extractProductData(pageUrl);
    const imageUrl = normalizeProductImage(extracted.imageUrl);
    if (!imageUrl) {
      throw new Error('A extração do anúncio não retornou imagem HTTPS válida.');
    }
    // Do not reuse an old candidate price as if it were current. The review
    // generator will say to check the live listing unless a fresh price exists.
    return {
      itemId: normalizedItemId,
      title: String(extracted.title || '').trim(),
      productUrl: String(extracted.url || pageUrl).trim(),
      price: null,
      imageUrl,
    };
  } catch (error) {
    extractionError = error instanceof Error ? error.message.slice(0, 220) : String(error).slice(0, 220);
    console.warn('[review-generation] product extraction/scraping failed for ' + itemId + ': ' + extractionError);
  }

  // Final fallback for environments where the listing cannot be scraped.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    throw new Error('Extração do anúncio falhou (' + extractionError + ') e CRON_SECRET não está disponível para fallback.');
  }

  const response = await fetch('https://www.vetor.blog/api/cron/ml-product-details', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + cronSecret,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ itemIds: [normalizedItemId] }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const contentType = response.headers.get('content-type') || 'desconhecido';
    const detail = contentType.includes('json')
      ? body.slice(0, 160)
      : 'resposta não JSON (content-type=' + contentType + ')';
    throw new Error(
      'Extração do anúncio falhou (' + extractionError + '); endpoint de fallback Production HTTP ' +
      response.status + ': ' + detail
    );
  }

  const payload = await response.json() as { results?: ProductionMLProductDetails[] };
  const product = (payload.results || []).find((entry) =>
    String(entry.itemId || '').replace(/-/g, '').toUpperCase() === normalizedItemId
  );
  if (!product) {
    throw new Error('O endpoint Production não retornou detalhes para ' + normalizedItemId + '.');
  }
  return product;
}

async function discoverAffiliateBackedProducts(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceKeyClient>>,
  existingPages: ExistingReview[],
  existingProductLinks: ProductLink[],
  dryRun: boolean,
  candidateLimit: number
): Promise<DiscoveryResult> {
  const credentialsAvailable = Boolean(process.env.CRON_SECRET?.trim());
  const result: DiscoveryResult = {
    candidates: [],
    credentialsAvailable,
    imported: 0,
    enriched: 0,
    skippedExisting: 0,
    skippedUnsafe: 0,
    detailErrors: 0,
  };

  if (!credentialsAvailable) {
    console.warn('[review-generation] Mercado Livre candidate discovery skipped: CRON_SECRET is not available to this workflow. Existing queued products can still be processed.');
    return result;
  }

  const { data, error } = await supabase
    .from('affiliate_link_ml_matches')
    .select('affiliate_link_id,matched_item_id,matched_product_id,matched_title,matched_url,match_score,match_status,affiliate_links!inner(id,name,category,slug,destination_url,source_type,status,priority)')
    .eq('match_status', 'matched')
    .order('match_score', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[review-generation] affiliate product discovery query failed:', error.message);
    return result;
  }

  const approved = ((data || []) as unknown as AffiliateMatchSource[])
    .filter((row) => {
      const source = row.affiliate_links;
      const score = Number(row.match_score || 0);
      return Boolean(
        source &&
        source.source_type === 'comparison_product' &&
        source.status === 'active' &&
        source.name?.trim() &&
        score >= 0.9 &&
        /^MLB-?\d+$/i.test(String(row.matched_item_id || '').trim()) &&
        isHttpsUrl(row.matched_url) &&
        isHttpsUrl(source.destination_url)
      );
    })
    .sort((a, b) => Number(b.match_score || 0) - Number(a.match_score || 0));

  // One source row per exact product name; duplicate comparative slots should
  // not create multiple reviews for the same product.
  const unique = new Map<string, AffiliateMatchSource>();
  for (const row of approved) {
    const name = String(row.affiliate_links?.name || '').trim();
    const key = canonicalProductName(name);
    if (key && !unique.has(key)) unique.set(key, row);
  }

  for (const row of unique.values()) {
    if (result.candidates.length >= candidateLimit) break;
    const source = row.affiliate_links;
    if (!source) continue;

    const name = String(source.name || '').trim();
    const expectedSlug = slugifyEditorialTitle(name);
    const existingReview = existingPages.find((page) =>
      page.content_type === 'review' &&
      (page.slug === expectedSlug || isSameProductPage(name, page))
    );
    if (existingReview) {
      result.skippedExisting += 1;
      continue;
    }

    // Never compete with an existing URL slug even if it belongs to an LP.
    if (existingPages.some((page) => page.slug === expectedSlug)) {
      result.skippedExisting += 1;
      continue;
    }

    const key = canonicalProductName(name);
    const existingLink = existingProductLinks.find((link) =>
      link.status !== 'archived' && canonicalProductName(link.product_name) === key
    );

    if (existingLink && isEligibleProduct(existingLink)) {
      // The normal queue already contains this product; let its regular path
      // process it exactly once.
      continue;
    }
    if (existingLink && (
      existingLink.has_review ||
      existingLink.status === 'reviewed' ||
      existingLink.status === 'video_generated' ||
      !['mercadolivre', 'multi'].includes(String(existingLink.marketplace || '').toLowerCase())
    )) {
      result.skippedExisting += 1;
      continue;
    }

    let productDetail: ProductionMLProductDetails;
    try {
      productDetail = await fetchProductionMLProductDetails(String(row.matched_item_id), String(row.matched_url || ''), String(row.matched_title || source.name || ''), row.matched_product_id);
    } catch (error) {
      result.detailErrors += 1;
      console.warn(
        '[review-generation] no product image/details for ' + name + ': ' +
        (error instanceof Error ? error.message : String(error))
      );
      continue;
    }

    const imageUrl = normalizeProductImage(productDetail.imageUrl);
    if (!imageUrl) {
      result.skippedUnsafe += 1;
      console.warn('[review-generation] skipped product without a verified image: ' + name);
      continue;
    }

    const productUrl = String(row.matched_url || '').trim();
    const affiliateUrl = String(source.destination_url || '').trim();
    if (!isHttpsUrl(productUrl) || !isHttpsUrl(affiliateUrl)) {
      result.skippedUnsafe += 1;
      continue;
    }

    const category = inferProductCategory(name, String(row.matched_title || ''), source.category);
    const priceValue = Number(productDetail.price);
    const notes = [
      'Importado automaticamente da Central de Afiliados.',
      'Correspondência Mercado Livre aprovada; score ' + Number(row.match_score || 0).toFixed(2) + '.',
      'Origem: ' + String(source.slug || source.id),
      'Anúncio: ' + String(row.matched_title || name),
    ].join(' ');

    if (existingLink) {
      // Fill only invalid/missing fields; preserve any existing affiliate
      // destination and valid product data already configured by the editor.
      const patch: Record<string, unknown> = {};
      if (!isHttpsUrl(existingLink.product_url)) patch.product_url = productUrl;
      if (!isHttpsUrl(existingLink.affiliate_url)) patch.affiliate_url = affiliateUrl;
      if (!isHttpsUrl(existingLink.image_url)) patch.image_url = imageUrl;
      if ((!existingLink.category || existingLink.category === 'Geral') && category) patch.category = category;
      if (!existingLink.price && Number.isFinite(priceValue) && priceValue > 0) patch.price = String(priceValue);
      if (!existingLink.notes) patch.notes = notes;

      if (!Object.keys(patch).length) {
        result.skippedExisting += 1;
        continue;
      }

      let enrichedRow: ProductLink;
      if (dryRun) {
        enrichedRow = { ...existingLink, ...patch } as ProductLink;
      } else {
        const { data: updated, error: updateError } = await supabase
          .from('product_links')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', existingLink.id)
          .select('*')
          .single();
        if (updateError || !updated) {
          console.error('[review-generation] failed to enrich existing product ' + name + ': ' + (updateError?.message || 'row not returned'));
          continue;
        }
        enrichedRow = updated as ProductLink;
      }

      existingProductLinks.push(enrichedRow);
      result.candidates.push(enrichedRow);
      result.enriched += 1;
      console.log('[review-generation] ' + (dryRun ? 'would enrich' : 'enriched') + ' existing product link: ' + name);
      continue;
    }

    const newRow = {
      slug: expectedSlug,
      product_name: name,
      category,
      product_url: productUrl,
      affiliate_url: affiliateUrl,
      image_url: imageUrl,
      marketplace: 'mercadolivre',
      status: 'active',
      source: 'api',
      has_review: false,
      has_video: false,
      review_slug: null,
      video_id: null,
      price: Number.isFinite(priceValue) && priceValue > 0 ? String(priceValue) : null,
      score: Number(row.match_score || 0),
      priority: 75,
      notes,
      tags: ['affiliate-discovery', 'mercadolivre-matched'],
    };

    let insertedRow: ProductLink;
    if (dryRun) {
      insertedRow = {
        ...newRow,
        id: 'dry-run-' + row.affiliate_link_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ProductLink;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('product_links')
        .insert(newRow)
        .select('*')
        .single();
      if (insertError || !inserted) {
        console.warn('[review-generation] failed to import candidate ' + name + ': ' + (insertError?.message || 'row not returned'));
        continue;
      }
      insertedRow = inserted as ProductLink;
    }

    existingProductLinks.push(insertedRow);
    result.candidates.push(insertedRow);
    result.imported += 1;
    console.log('[review-generation] ' + (dryRun ? 'would import' : 'imported') + ' affiliate-backed candidate: ' + name);
  }

  return result;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const maxAttemptsRaw = Number(process.env.REVIEW_GENERATION_MAX_ATTEMPTS || 4);
  const maxAttempts = Number.isFinite(maxAttemptsRaw)
    ? Math.min(6, Math.max(1, Math.floor(maxAttemptsRaw)))
    : 4;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    throw new Error('Supabase Service Role ausente; geração interrompida sem simular uma gravação.');
  }
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    throw new Error('NVIDIA_API_KEY ausente; geração de review interrompida.');
  }

  const [{ data: rawLinks, error: linksError }, { data: existingRows, error: reviewsError }, { data: allProductRows, error: allProductLinksError }] = await Promise.all([
    supabase
      .from('product_links')
      .select('*')
      .eq('has_review', false)
      .neq('status', 'reviewed')
      .neq('status', 'archived')
      .not('product_url', 'is', null)
      .neq('product_url', '')
      .not('affiliate_url', 'is', null)
      .neq('affiliate_url', '')
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('reviews')
      .select('slug,product,status,content_type')
      .limit(2000),
    supabase
      .from('product_links')
      .select('*')
      .limit(1000),
  ]);

  if (linksError) throw new Error('Não foi possível ler a fila de produtos: ' + linksError.message);
  if (reviewsError) throw new Error('Não foi possível conferir reviews/LPs existentes: ' + reviewsError.message);
  if (allProductLinksError) throw new Error('Não foi possível verificar duplicações na fila de produtos: ' + allProductLinksError.message);

  const existingPages = (existingRows || []) as ExistingReview[];
  const pagesBySlug = new Map(existingPages.map((page) => [page.slug, page]));
  const allProductLinks = (allProductRows || []) as ProductLink[];

  const links = ((rawLinks || []) as ProductLink[]).filter(isEligibleProduct);
  const eligible: ProductLink[] = [];
  let reconciled = 0;
  let skippedExisting = 0;

  for (const link of links) {
    const expectedSlug = slugifyEditorialTitle(link.product_name);
    const exactSlugPage = pagesBySlug.get(expectedSlug);
    const sameProductPages = existingPages.filter((page) => isSameProductPage(link.product_name, page));
    const existingReview = sameProductPages[0] ||
      (exactSlugPage?.content_type === 'review' ? exactSlugPage : undefined);

    if (existingReview) {
      if (!dryRun) {
        const marked = await markProductLinkReviewed(link.id, existingReview.slug);
        if (marked.error) {
          throw new Error('Review já existente, mas falhou ao reconciliar produto ' + link.product_name + ': ' + marked.error);
        }
      }
      console.log('[review-generation] ' + (dryRun ? 'would reconcile' : 'reconciled') + ' existing review: ' + link.product_name + ' -> ' + existingReview.slug);
      reconciled += 1;
      continue;
    }

    // A LP and a review cannot occupy the same unique slug. Do not overwrite an LP
    // or create duplicate editorial content when the same product already has a page.
    if (exactSlugPage || sameProductPages.length > 0) {
      console.log('[review-generation] skipped existing page/slug: ' + link.product_name);
      skippedExisting += 1;
      continue;
    }

    eligible.push(link);
  }

  const discovery = await discoverAffiliateBackedProducts(
    supabase,
    existingPages,
    allProductLinks,
    dryRun,
    maxAttempts
  );
  eligible.push(...discovery.candidates.filter(isEligibleProduct));

  console.log(JSON.stringify({
    event: 'daily-review-queue-inspected',
    dryRun,
    totalRowsRead: (rawLinks || []).length,
    eligibleProducts: eligible.length,
    reconciledExistingReviews: reconciled,
    skippedExistingPages: skippedExisting,
    maxAttempts,
    affiliateDiscoveryCredentialsAvailable: discovery.credentialsAvailable,
    affiliateCandidatesImported: discovery.imported,
    existingProductsEnriched: discovery.enriched,
    affiliateCandidatesSkippedExisting: discovery.skippedExisting,
    affiliateCandidatesSkippedUnsafe: discovery.skippedUnsafe,
    affiliateProductDetailErrors: discovery.detailErrors,
  }));

  if (eligible.length === 0) {
    const message = 'Nenhum produto novo elegível após deduplicação; a fila contém itens sem imagem/URL válida ou produtos que já possuem review.';
    if (dryRun) {
      console.warn('[review-generation] ' + message + ' Nenhum dado foi alterado.');
      return;
    }
    throw new Error(message);
  }

  if (dryRun) {
    console.log('[review-generation] dry-run OK; nenhum conteúdo foi gerado nem alterado.');
    console.log('[review-generation] próximos candidatos:');
    for (const link of eligible.slice(0, Math.min(maxAttempts, 5))) {
      console.log(JSON.stringify({
        id: link.id,
        product: link.product_name,
        category: link.category,
        marketplace: link.marketplace,
        hasProductUrl: isHttpUrl(link.product_url),
        hasAffiliateUrl: isHttpUrl(link.affiliate_url),
        hasImageUrl: isHttpUrl(link.image_url),
      }));
    }
    return;
  }

  const attempts = eligible.slice(0, maxAttempts);
  const failures: Array<{ product: string; error: string }> = [];

  for (const [index, link] of attempts.entries()) {
    console.log('[review-generation] attempt ' + (index + 1) + '/' + attempts.length + ': ' + link.product_name);
    try {
      const input = productLinkToPipelineInput(link);
      input.title = link.product_name;
      const outcome = await runReviewPipeline(input, 'cron', 'review');

      if (outcome.status !== 'created') {
        const error = outcome.status === 'validation_failed'
          ? outcome.issues.join('; ')
          : outcome.status === 'db_error'
            ? outcome.error
            : outcome.error;
        failures.push({ product: link.product_name, error });
        console.error('[review-generation] rejected: ' + link.product_name + ' — ' + error);
        continue;
      }

      const { data: saved, error: verifyError } = await supabase
        .from('reviews')
        .select('slug,status,content_type,product')
        .eq('slug', outcome.slug)
        .maybeSingle();

      if (verifyError || !saved) {
        failures.push({
          product: link.product_name,
          error: 'A pipeline reportou criação, mas a verificação da persistência falhou: ' + (verifyError?.message || 'registro não encontrado'),
        });
        console.error('[review-generation] persistence verification failed for ' + outcome.slug);
        continue;
      }

      if (saved.content_type !== 'review' || !['draft', 'published'].includes(saved.status)) {
        failures.push({
          product: link.product_name,
          error: 'Persistência incompatível: content_type=' + saved.content_type + ', status=' + saved.status,
        });
        console.error('[review-generation] unexpected persisted state for ' + outcome.slug);
        continue;
      }

      const marked = await markProductLinkReviewed(link.id, outcome.slug);
      if (marked.error) {
        throw new Error('Review salvo como ' + saved.status + ', mas o vínculo produto→review não foi atualizado: ' + marked.error);
      }

      const { data: relation, error: relationError } = await supabase
        .from('product_links')
        .select('has_review,review_slug')
        .eq('id', link.id)
        .maybeSingle();

      if (relationError || !relation?.has_review || relation.review_slug !== outcome.slug) {
        throw new Error('Review salvo, mas a verificação do vínculo produto→review falhou.');
      }

      console.log(JSON.stringify({
        event: 'daily-review-created',
        product: link.product_name,
        slug: outcome.slug,
        status: saved.status,
        content_type: saved.content_type,
        url: 'https://www.vetor.blog/reviews/' + outcome.slug + '/',
        productLinkUpdated: true,
      }));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ product: link.product_name, error: message });
      console.error('[review-generation] failed: ' + link.product_name + ' — ' + message);
    }
  }

  console.error('[review-generation] nenhum review foi criado após ' + attempts.length + ' tentativa(s).');
  for (const failure of failures) {
    console.error(JSON.stringify({ event: 'candidate-failure', ...failure }));
  }
  throw new Error('Geração diária falhou; nenhum review novo foi confirmado. Consulte os erros registrados acima.');
}

main().catch((error: unknown) => {
  console.error('[review-generation] fatal:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
