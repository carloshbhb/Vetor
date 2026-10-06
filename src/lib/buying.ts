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

export type BuyingIntent = 'baratos' | 'custo-beneficio';

export interface BuyingIntentPage {
  categoryName: string;
  categorySlug: string;
  intent: BuyingIntent;
  count: number;
  reviews: Review[];
}

export const BUYING_INTENTS: BuyingIntent[] = ['baratos', 'custo-beneficio'];

// Clusters prioritários da estratégia SEO comercial. Os aliases permitem
// manter a arquitetura estável mesmo quando a categoria editorial varia.
export const PRIORITY_BUYING_CATEGORIES = [
  { label: 'Fones de Ouvido', aliases: ['Fones de Ouvido', 'Fones'] },
  { label: 'Notebooks', aliases: ['Notebooks'] },
  { label: 'Acessórios para Games', aliases: ['Acessórios para Games', 'Acessorios Gamer', 'Acessórios Gamer'] },
  { label: 'Áudio Profissional', aliases: ['Áudio Profissional', 'Audio Profissional'] },
  { label: 'Casa Inteligente', aliases: ['Casa Inteligente'] },
] as const;

export function buildPriorityBuyingCategories(
  reviews: Review[],
  minimum = 3
): BuyingGuideCategory[] {
  const categories = buildBuyingGuideCategories(reviews, minimum);
  return PRIORITY_BUYING_CATEGORIES
    .map((priority) => {
      const match = categories.find((category) =>
        priority.aliases.some((alias) => category.name.toLowerCase() === alias.toLowerCase())
      );
      return match || null;
    })
    .filter((category): category is BuyingGuideCategory => category !== null);
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

function rankByIntent(reviews: Review[], intent: BuyingIntent): Review[] {
  const withPrice = reviews.filter(
    (review) => reviewScore(review) > 0 && parseReviewPrice(review.price_new) !== null
  );

  if (intent === 'baratos') {
    return [...withPrice].sort((a, b) => {
      const aPrice = parseReviewPrice(a.price_new) ?? Number.POSITIVE_INFINITY;
      const bPrice = parseReviewPrice(b.price_new) ?? Number.POSITIVE_INFINITY;
      return (
        aPrice - bPrice ||
        reviewScore(b) - reviewScore(a) ||
        new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      );
    });
  }

  return [...withPrice].sort((a, b) => {
    const aPrice = parseReviewPrice(a.price_new) ?? Number.POSITIVE_INFINITY;
    const bPrice = parseReviewPrice(b.price_new) ?? Number.POSITIVE_INFINITY;
    const aIndex = (reviewScore(a) * 1000) / aPrice;
    const bIndex = (reviewScore(b) * 1000) / bPrice;
    return bIndex - aIndex || reviewScore(b) - reviewScore(a) || aPrice - bPrice;
  });
}

export function buildBuyingIntentPages(
  reviews: Review[],
  minimum = 4
): BuyingIntentPage[] {
  const groups = new Map<string, Review[]>();

  for (const review of reviews) {
    if (
      review.status !== 'published' ||
      isGuideLikeSlug(review.slug) ||
      reviewScore(review) <= 0
    ) {
      continue;
    }

    const list = groups.get(review.category) || [];
    list.push(review);
    groups.set(review.category, list);
  }

  const pages: BuyingIntentPage[] = [];

  for (const [categoryName, items] of groups.entries()) {
    const priced = items.filter((review) => parseReviewPrice(review.price_new) !== null);
    if (priced.length < minimum) continue;

    const categorySlug = buyingCategorySlug(categoryName);

    for (const intent of BUYING_INTENTS) {
      const ranked = rankByIntent(items, intent).slice(0, 10);
      if (ranked.length >= minimum) {
        pages.push({
          categoryName,
          categorySlug,
          intent,
          count: ranked.length,
          reviews: ranked,
        });
      }
    }
  }

  return pages;
}

export function getBuyingIntentLabel(intent: BuyingIntent): string {
  return intent === 'baratos' ? 'Mais baratos' : 'Custo-benefício';
}

export function getBuyingIntentDescription(
  intent: BuyingIntent,
  categoryName: string
): string {
  if (intent === 'baratos') {
    return (
      'Ordenação pelo menor preço consultado entre análises com preço disponível. ' +
      'O valor pode mudar por loja, versão, promoção e data da consulta.'
    );
  }

  return (
    'Ordenação por índice de valor: nota Vetor × 1.000 ÷ preço consultado. ' +
    'É uma referência matemática, não uma escolha universal.'
  );
}

function formatNumericPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function parseReviewPrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.,]/g, '').trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseOfferPrice(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,]/g, '').trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
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
    const aPrice = parseOfferPrice(a.price);
    const bPrice = parseOfferPrice(b.price);

    if (aPrice === null && bPrice !== null) return 1;
    if (aPrice !== null && bPrice === null) return -1;
    if (aPrice !== null && bPrice !== null && aPrice !== bPrice) {
      return aPrice - bPrice;
    }

    const aPrimary = a.label === marketplaceLabel(review.marketplace);
    const bPrimary = b.label === marketplaceLabel(review.marketplace);
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;

    return (
      new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
    );
  });
}
