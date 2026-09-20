/**
 * Mercado Livre API Client
 * Documentation: https://developers.mercadolivre.com.br/en_us/api-docs
 */

import { getValidAccessToken } from './mercadolivre-auth';

const ML_API_BASE = 'https://api.mercadolibre.com';

export interface MLProduct {
  id: string;
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  condition: 'new' | 'used';
  permalink: string;
  thumbnail: string;
  pictures?: Array<{ id: string; url: string; secure_url: string }>;
  attributes?: Array<{ id: string; name: string; value_name: string }>;
  seller?: { id: number };
  status?: string;
}

export interface MLCategory {
  id: string;
  name: string;
  path_from_root: Array<{ id: string; name: string }>;
}

export interface MLSearchResult {
  results: MLProduct[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

/**
 * Make authenticated API request
 */
async function mlFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const token = await getValidAccessToken();
  const url = new URL(`${ML_API_BASE}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get product details by ID
 */
export async function getProduct(productId: string): Promise<MLProduct> {
  return mlFetch<MLProduct>(`/items/${productId}`);
}

/**
 * Get product with pictures
 */
export async function getProductWithPictures(productId: string): Promise<MLProduct> {
  return mlFetch<MLProduct>(`/items/${productId}`, {
    attributes: 'id,title,category_id,price,currency_id,condition,permalink,thumbnail,pictures,attributes,seller,status',
  });
}

/**
 * Search products by keyword
 */
export async function searchProducts(
  query: string,
  options?: {
    category?: string;
    limit?: number;
    offset?: number;
    sort?: 'relevance' | 'price_asc' | 'price_desc';
  }
): Promise<MLSearchResult> {
  const params: Record<string, string> = {
    q: query,
    limit: String(options?.limit || 10),
    offset: String(options?.offset || 0),
  };

  if (options?.category) {
    params.category = options.category;
  }

  if (options?.sort) {
    params.sort = options.sort;
  }

  return mlFetch<MLSearchResult>('/sites/MLB/search', params);
}

/**
 * Get category details
 */
export async function getCategory(categoryId: string): Promise<MLCategory> {
  return mlFetch<MLCategory>(`/categories/${categoryId}`);
}

/**
 * Get best sellers by category
 */
export async function getBestSellers(categoryId?: string): Promise<MLProduct[]> {
  const endpoint = categoryId
    ? `/sites/MLB/categories/${categoryId}/best_sellers`
    : '/sites/MLB/best_sellers';

  const result = await mlFetch<{ items: MLProduct[] }>(endpoint);
  return result.items || [];
}

/**
 * Get trending searches
 */
export async function getTrendingSearches(): Promise<string[]> {
  const result = await mlFetch<{ queries: Array<{ query: string }> }>(
    '/sites/MLB/search_trends'
  );
  return result.queries?.map((q) => q.query) || [];
}

/**
 * Extract product data from ML product
 */
export function formatProductData(product: MLProduct) {
  return {
    id: product.id,
    title: product.title,
    price: product.price,
    currency: product.currency_id,
    condition: product.condition === 'new' ? 'Novo' : 'Usado',
    url: product.permalink,
    imageUrl: product.thumbnail?.replace('http:', 'https:').replace('-I.jpg', '-O.jpg') || '',
    category: product.category_id,
    attributes: product.attributes?.reduce(
      (acc, attr) => {
        acc[attr.name] = attr.value_name || '';
        return acc;
      },
      {} as Record<string, string>
    ) || {},
  };
}

/**
 * Get product images
 */
export async function getProductImages(productId: string): Promise<string[]> {
  const product = await getProductWithPictures(productId);
  return (
    product.pictures?.map((pic) =>
      pic.secure_url?.replace('http:', 'https:').replace('-I.jpg', '-O.jpg') || pic.url
    ) || []
  );
}
