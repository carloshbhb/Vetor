import 'server-only';
import { unstable_cache } from 'next/cache';
import { getProductLinksByReviewSlug, getReviewedProductLinksByCategory } from './product-links';
import { getAffiliateLinksBySlugs, getAffiliateLinksForProductNames, getAffiliateLinksForReview } from './affiliate-links';
import {
  fetchAllReviews as loadAllReviews,
  fetchAllReviewSummaries as loadAllReviewSummaries,
  fetchAllLandingPages as loadAllLandingPages,
  fetchAllLandingPageSummaries as loadAllLandingPageSummaries,
  fetchReviewBySlug as loadReviewBySlug,
  fetchAllViralArticles as loadAllViralArticles,
  fetchAllViralArticleSummaries as loadAllViralArticleSummaries,
  fetchViralArticleBySlug as loadViralArticleBySlug,
  fetchCategories as loadCategories,
  fetchReviewsByCategory as loadReviewsByCategory,
  isGuiaLike as isGuideLike,
} from './data';

export { normalizeCategoryName, isGuiaLike } from './data';

const TTL_SECONDS = 300;
const SCOPE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'supabase-unconfigured';

export const fetchAllReviews = unstable_cache(
  async () => loadAllReviews(),
  ['vetor-public-reviews-full-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:reviews:full'] },
);

export const fetchAllReviewSummaries = unstable_cache(
  async () => loadAllReviewSummaries(),
  ['vetor-public-review-summaries-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:reviews:summary'] },
);

export const fetchAllLandingPages = unstable_cache(
  async () => loadAllLandingPages(),
  ['vetor-public-landing-pages-full-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:landing-pages:full'] },
);

export const fetchAllLandingPageSummaries = unstable_cache(
  async () => loadAllLandingPageSummaries(),
  ['vetor-public-landing-pages-summary-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:landing-pages:summary'] },
);

const cachedReviewBySlug = unstable_cache(
  async (slug: string) => loadReviewBySlug(slug),
  ['vetor-public-review-by-slug-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:reviews:full'] },
);

export async function fetchReviewBySlug(slug: string) {
  return cachedReviewBySlug(slug);
}

export const fetchAllViralArticles = unstable_cache(
  async () => loadAllViralArticles(),
  ['vetor-public-comparatives-full-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:comparatives:full'] },
);

export const fetchAllViralArticleSummaries = unstable_cache(
  async () => loadAllViralArticleSummaries(),
  ['vetor-public-comparatives-summary-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:comparatives:summary'] },
);

const cachedViralArticleBySlug = unstable_cache(
  async (slug: string) => loadViralArticleBySlug(slug),
  ['vetor-public-comparative-by-slug-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:comparatives:full'] },
);

export async function fetchViralArticleBySlug(slug: string) {
  return cachedViralArticleBySlug(slug);
}

export const fetchCategories = unstable_cache(
  async () => loadCategories(),
  ['vetor-public-categories-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:categories'] },
);

const cachedReviewsByCategory = unstable_cache(
  async (category: string) => loadReviewsByCategory(category),
  ['vetor-public-category-reviews-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:reviews:full', 'vetor:categories'] },
);

export async function fetchReviewsByCategory(category: string) {
  return cachedReviewsByCategory(category);
}

export const fetchGuias = unstable_cache(
  async () => (await loadAllReviewSummaries()).filter(isGuideLike),
  ['vetor-public-guides-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:reviews:summary'] },
);


// Public product and affiliate data are read by many public pages. Keep a short-lived
// server cache to avoid repeated database calls on every render/revalidation.
const cachedProductLinksByReviewSlug = unstable_cache(
  async (slug: string) => getProductLinksByReviewSlug(slug),
  ['vetor-public-product-links-by-review-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:product-links'] },
);

export async function fetchProductLinksByReviewSlug(slug: string) {
  return cachedProductLinksByReviewSlug(slug);
}

const cachedReviewedProductLinksByCategory = unstable_cache(
  async (category: string, excludeReviewSlug: string, limit: number) =>
    getReviewedProductLinksByCategory(category, excludeReviewSlug || undefined, limit),
  ['vetor-public-reviewed-product-links-by-category-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:product-links'] },
);

export async function fetchReviewedProductLinksByCategory(
  category: string,
  excludeReviewSlug?: string,
  limit = 6,
) {
  return cachedReviewedProductLinksByCategory(category, excludeReviewSlug || '', limit);
}

const cachedAffiliateLinksBySlugs = unstable_cache(
  async (slugs: string[]) => getAffiliateLinksBySlugs(slugs),
  ['vetor-public-affiliate-links-by-slugs-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:affiliate-links'] },
);

export async function fetchAffiliateLinksBySlugs(slugs: string[]) {
  const stableSlugs = Array.from(new Set(slugs.map((slug) => String(slug || '').trim()).filter(Boolean))).sort();
  return cachedAffiliateLinksBySlugs(stableSlugs);
}

const cachedAffiliateLinksForReview = unstable_cache(
  async (slug: string) => getAffiliateLinksForReview(slug),
  ['vetor-public-affiliate-links-by-review-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:affiliate-links'] },
);

export async function fetchAffiliateLinksForReview(slug: string) {
  return cachedAffiliateLinksForReview(slug);
}

const cachedAffiliateLinksForProductNames = unstable_cache(
  async (names: string[]) => getAffiliateLinksForProductNames(names),
  ['vetor-public-affiliate-links-by-product-names-v1', SCOPE],
  { revalidate: TTL_SECONDS, tags: ['vetor:affiliate-links'] },
);

export async function fetchAffiliateLinksForProductNames(names: string[]) {
  const stableNames = Array.from(
    new Set(names.map((name) => String(name || '').trim()).filter(Boolean)),
  ).sort();
  return cachedAffiliateLinksForProductNames(stableNames);
}
