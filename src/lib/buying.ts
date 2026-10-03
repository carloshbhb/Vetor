import type { Review } from './types';
import type { ProductLink } from './product-links';

export interface MarketplaceOffer {
  marketplace: string;
  label: string;
  price: string;
  href: string;
  checkedAt: string;
  isAffiliate: boolean;
}

export interface BuyingGuideCategory {
  name: string;
  slug: string;
  count: number;
  featured: Review[];
}

const MARKETPLACE_LABELS: Record<string, string> = {
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  shopee: 'Shopee',
  magalu: 'Magalu',
  magazineluiza: 'Magalu',
  siteoficial: 'Loja oficial',
};

export function marketplaceLabel(value: string | null | undefined): string {
  const key = value?.trim().toLowerCase() || '';
  return MARKETPLACE_LABELS[key] || (value?.trim() || 'Loja');
}

export function buyingCategorySlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function reviewScore(review: Review): number {
  const value = Number(review.verdict_score || review.hero_overall_score || 0);
  return Number.isFinite(value) ? value : 0;
}

export function isGuideLikeSlug(slug: string): boolean {
  const value = slug.toLowerCase();
  return value.includes('guia') || value.startsWith('melhores-') || value.startsWith('top-');
}

export function rankBuyingReviews(reviews: Review[]): Review[] {
  return reviews
    .filter(
      (review) =>
        review.status === 'published' &&
        !isGuideLikeSlug(review.slug) &&
        reviewScore(review) > 0
    )
    .sort((a, b) => {
      const scoreDiff = reviewScore(b) - reviewScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
      );
    });
}

export function buildBuyingGuideCategories(reviews: Review[], minimum = 3): BuyingGuideCategory[] {
  const groups = new Map<string, Review[]>();

  for (const review of reviews) {
    if (review.status !== 'published' || isGuideLikeSlug(review.slug)) continue;
    const list = groups.get(review.category) || [];
    list.push(review);
    groups.set(review.category, list);
  }

  return Array.from(groups.entries())
    .map(([name, items]) => {
      const featured = rankBuyingReviews(items).slice(0, 3);
      return { name, slug: buyingCategorySlug(name), count: items.length, featured };
    })
    .filter((category) => category.featured.length >= minimum)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
}

function formatNumericPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function isFinitePrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function buildMarketplaceOffers(review: Review, links: ProductLink[]): MarketplaceOffer[] {
  const byMarketplace = new Map<string, ProductLink>();

  for (const link of links) {
    if (!link.marketplace || link.status === 'archived') continue;
    const key = link.marketplace.trim().toLowerCase();
    if (!byMarketplace.has(key)) byMarketplace.set(key, link);
  }

  const offers: MarketplaceOffer[] = Array.from(byMarketplace.entries()).map(([key, link]) => {
    const useReviewPrice = key === (review.marketplace || '').trim().toLowerCase();
    const price = isFinitePrice(link.price)
      ? formatNumericPrice(link.price)
      : useReviewPrice
        ? review.price_new || ''
        : '';
    const href = link.affiliate_url
      ? '/go/' + link.slug + '/'
      : useReviewPrice && review.affiliate_url
        ? '/go/' + review.slug + '/'
        : link.product_url;

    return {
      marketplace: key,
      label: marketplaceLabel(key),
      price,
      href,
      checkedAt: link.updated_at || review.updated_at,
      isAffiliate: Boolean(link.affiliate_url || (useReviewPrice && review.affiliate_url)),
    };
  });

  if (offers.length === 0 && (review.affiliate_url || review.price_new)) {
    offers.push({
      marketplace: (review.marketplace || 'mercadolivre').trim().toLowerCase(),
      label: marketplaceLabel(review.marketplace),
      price: review.price_new || '',
      href: review.affiliate_url ? '/go/' + review.slug + '/' : '#',
      checkedAt: review.updated_at,
      isAffiliate: Boolean(review.affiliate_url),
    });
  }

  return offers.sort((a, b) => {
    const aPrice = Number(a.price.replace(/[^0-9,]/g, '').replace(',', '.')) || Number.POSITIVE_INFINITY;
    const bPrice = Number(b.price.replace(/[^0-9,]/g, '').replace(',', '.')) || Number.POSITIVE_INFINITY;
    return aPrice - bPrice || (a.label === marketplaceLabel(review.marketplace) ? -1 : 1);
  });
}
