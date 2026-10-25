import type { MetadataRoute } from 'next';
import { fetchAllReviews, fetchAllLandingPageSummaries, fetchAllViralArticleSummaries, fetchCategories } from '@/lib/public-data';
import { authors } from '@/data/authors';
import { buildIndexableTagIndex } from '@/lib/tags';
import { buildBuyingGuideCategories, buildBuyingIntentPages } from '@/lib/buying';

export const revalidate = 300;

function latestReviewModification(
  items: Array<{ updated_at?: string | null; created_at?: string | null }>
): Date | undefined {
  const timestamps = items
    .map((item) => item.updated_at || item.created_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  return timestamps.length ? new Date(Math.max(...timestamps)) : undefined;
}

function normalizeCategory(value: string): string {
  return value.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, landingPages, viralArticles, categories] = await Promise.all([
    fetchAllReviews(),
    fetchAllLandingPageSummaries(),
    fetchAllViralArticleSummaries(),
    fetchCategories(),
  ]);

  const baseUrl = 'https://www.vetor.blog';

  const legacyReviewSlugs = new Set([
    'echo-dot-5',
    'amazon-echo-dot-5-geracao',
    'echo-dot-5-alexa-completo',
    'focusrite-scarlett-2i2-4-geracao',
    'airpods-pro-2',
    'redmi-watch-5',
    'asus-vivobook-15-essencial',
    'sony-wf-1000xm5',
  ]);

  const latestSiteUpdate = latestReviewModification(reviews) || new Date('2026-10-12T00:00:00.000Z');
  const editorialDate = new Date('2026-10-01T00:00:00.000Z');
  const legalDate = new Date('2026-09-23T00:00:00.000Z');

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl + '/',
      lastModified: latestSiteUpdate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/reviews/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/reviews/categoria/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/melhores/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comparativos/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sobre/`,
      lastModified: editorialDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacidade/`,
      lastModified: legalDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contato/`,
      lastModified: legalDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/author/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/tags/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guias/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ofertas/`,
      lastModified: latestSiteUpdate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/como-avaliamos/`,
      lastModified: editorialDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/politica-editorial/`,
      lastModified: editorialDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/afiliados/`,
      lastModified: editorialDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/termos/`,
      lastModified: legalDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const reviewPages: MetadataRoute.Sitemap = reviews
    .filter((r) => !legacyReviewSlugs.has(r.slug))
    .map((r) => ({
    url: `${baseUrl}/reviews/${r.slug}/`,
    lastModified: new Date(r.updated_at || r.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const landingPageEntries: MetadataRoute.Sitemap = landingPages.map((page) => ({
    url: page.meta_canonical || `${baseUrl}/reviews/${page.slug}/`,
    lastModified: new Date(page.updated_at || page.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const viralPages: MetadataRoute.Sitemap = viralArticles.map((a) => ({
    url: `${baseUrl}/comparativos/${a.slug}/`,
    lastModified: new Date(a.updated_at || a.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => {
    const lastModified = latestReviewModification(
      reviews.filter((review) => normalizeCategory(review.category) === normalizeCategory(category.name))
    );

    return {
      url: baseUrl + '/reviews/categoria/' + encodeURIComponent(category.name) + '/',
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });

  const buyingGuidePages: MetadataRoute.Sitemap = buildBuyingGuideCategories(reviews, 3).map((category) => {
    const lastModified = latestReviewModification(
      reviews.filter((review) => normalizeCategory(review.category) === normalizeCategory(category.name))
    );

    return {
      url: baseUrl + '/melhores/' + category.slug + '/',
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    };
  });

  const buyingIntentPages: MetadataRoute.Sitemap = buildBuyingIntentPages(reviews, 4).map((item) => ({
    url: `${baseUrl}/melhores/${item.categorySlug}/${item.intent}/`,
    lastModified: new Date(
      Math.max(
        ...item.reviews.map((review) =>
          new Date(review.updated_at || review.created_at).getTime()
        )
      )
    ),
    changeFrequency: 'weekly' as const,
    priority: 0.78,
  }));

  const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${baseUrl}/author/${a.slug}/`,
    lastModified: latestSiteUpdate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const tagIndex = buildIndexableTagIndex(reviews);
  const tagPages: MetadataRoute.Sitemap = tagIndex.map((t) => {
    const tagReviews = reviews.filter((r) => {
      const kw = (r.meta_keywords || '').toLowerCase();
      return kw.includes(t.tag.toLowerCase());
    });
    const lastModified = latestReviewModification(tagReviews) || latestSiteUpdate;

    return {
      url: `${baseUrl}/tags/${t.slug}/`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    };
  });

  const candidates: MetadataRoute.Sitemap = [
    ...staticPages,
    ...reviewPages,
    ...landingPageEntries,
    ...viralPages,
    ...categoryPages,
    ...buyingGuidePages,
    ...buyingIntentPages,
    ...authorPages,
    ...tagPages,
  ];

  // Keep the sitemap aligned with canonical, same-site, crawlable URL forms.
  // Database-provided canonical fields can be relative or repeated by multiple
  // content collections; normalize them and emit each canonical URL only once.
  const uniqueEntries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  for (const entry of candidates) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(entry.url, `${baseUrl}/`);
    } catch {
      continue;
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.origin !== baseUrl ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      continue;
    }

    if (!parsedUrl.pathname.endsWith('/')) {
      parsedUrl.pathname += '/';
    }

    const canonicalUrl = parsedUrl.toString();
    if (seenUrls.has(canonicalUrl)) continue;

    seenUrls.add(canonicalUrl);
    uniqueEntries.push({ ...entry, url: canonicalUrl });
  }

  return uniqueEntries;
}
