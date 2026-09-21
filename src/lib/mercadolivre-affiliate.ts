/**
 * Mercado Livre Affiliate Link Generator
 * Documentation: https://www.mercadolivre.com.br/afiliados/linkbuilder
 */

import { getProduct, searchProducts, getBestSellers } from './mercadolivre-api';
import type { MLProduct } from './mercadolivre-api';

export interface AffiliateLink {
  originalUrl: string;
  trackingUrl: string;
  shortUrl?: string;
  productId: string;
  title: string;
  price: number;
  commission: number;
}

/**
 * Generate affiliate tracking URL
 * Format: https://www.mercadolivre.com.br/produto?matt_tool={tracking_id}&matt_word=&matt_source=&matt_campaign=&matt_medium=
 */
export function generateTrackingUrl(
  productUrl: string,
  trackingId: string,
  options?: {
    word?: string;
    source?: string;
    campaign?: string;
    medium?: string;
  }
): string {
  const url = new URL(productUrl);

  url.searchParams.set('matt_tool', trackingId);
  url.searchParams.set('matt_word', options?.word || '');
  url.searchParams.set('matt_source', options?.source || '');
  url.searchParams.set('matt_campaign', options?.campaign || 'vetor_blog');
  url.searchParams.set('matt_medium', options?.medium || 'video');

  return url.toString();
}

/**
 * Extract product ID from Mercado Livre URL
 */
export function extractProductId(url: string): string | null {
  const patterns = [
    /MLB-?\d+/i,
    /\/p\/MLB/i,
    /\/MLB-?\d+/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[0].replace(/-/g, '').replace('/p/', '').replace('/MLB', 'MLB');
    }
  }

  return null;
}

/**
 * Generate affiliate link for a product
 */
export async function generateAffiliateLink(
  productUrl: string,
  trackingId: string,
  options?: {
    word?: string;
    source?: string;
    campaign?: string;
    medium?: string;
  }
): Promise<AffiliateLink | null> {
  const productId = extractProductId(productUrl);

  if (!productId) {
    console.error('[ML Affiliate] Could not extract product ID from URL:', productUrl);
    return null;
  }

  try {
    const product = await getProduct(productId);
    const trackingUrl = generateTrackingUrl(product.permalink, trackingId, options);

    return {
      originalUrl: product.permalink,
      trackingUrl,
      productId: product.id,
      title: product.title,
      price: product.price,
      commission: product.price * 0.05, // 5% typical commission
    };
  } catch (error) {
    console.error('[ML Affiliate] Failed to get product details:', error);
    return null;
  }
}

/**
 * Generate affiliate links for multiple products
 */
export async function generateAffiliateLinks(
  productUrls: string[],
  trackingId: string,
  options?: {
    word?: string;
    source?: string;
    campaign?: string;
    medium?: string;
  }
): Promise<AffiliateLink[]> {
  const results: AffiliateLink[] = [];

  for (const url of productUrls) {
    const link = await generateAffiliateLink(url, trackingId, options);
    if (link) {
      results.push(link);
    }
  }

  return results;
}

/**
 * Get best sellers with affiliate links
 */
export async function getBestSellersWithAffiliateLinks(
  trackingId: string,
  limit: number = 10
): Promise<AffiliateLink[]> {
  try {
    const items = await getBestSellers();

    return items.slice(0, limit).map((item: MLProduct) => ({
      originalUrl: item.permalink,
      trackingUrl: generateTrackingUrl(item.permalink, trackingId),
      productId: item.id,
      title: item.title,
      price: item.price,
      commission: item.price * 0.05,
    }));
  } catch (error) {
    console.error('[ML Affiliate] Failed to get best sellers:', error);
    return [];
  }
}

/**
 * Search products with affiliate links
 */
export async function searchProductsWithAffiliateLinks(
  query: string,
  trackingId: string,
  options?: {
    category?: string;
    limit?: number;
  }
): Promise<AffiliateLink[]> {
  try {
    const result = await searchProducts(query, {
      category: options?.category,
      limit: options?.limit || 10,
    });

    return result.results.map((item: MLProduct) => ({
      originalUrl: item.permalink,
      trackingUrl: generateTrackingUrl(item.permalink, trackingId),
      productId: item.id,
      title: item.title,
      price: item.price,
      commission: item.price * 0.05,
    }));
  } catch (error) {
    console.error('[ML Affiliate] Failed to search products:', error);
    return [];
  }
}
