import type { Review, ViralArticle } from './types';

const SITE_URL = 'https://www.vetor.blog';

export function seo(title: string, description: string) {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export function generateSEO(title: string, description: string) {
  return seo(title, description);
}

function parseBRLPrice(raw: string | null | undefined): string | null {
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
  if (!Number.isFinite(value) || value <= 0) return null;
  return value.toFixed(2);
}

function scoreToFiveScale(score: number | null | undefined): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return null;
  return Math.round((score / 2) * 10) / 10;
}

function buildReviewBody(review: Review): string {
  const lead = (review.hero_lead || '').trim();
  const firstSection = (review.sections?.[0]?.content || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!lead) return firstSection.slice(0, 500);
  if (!firstSection) return lead;
  return `${lead} ${firstSection.slice(0, 300)}`.trim();
}

export function generateReviewSchema(review: Review): Record<string, unknown> {
  const score = scoreToFiveScale(
    review.verdict_score > 0 ? review.verdict_score : review.hero_overall_score
  );
  const price = parseBRLPrice(review.price_new);
  const reviewCount = Number(review.schema_review_count);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: review.product,
    description: review.hero_lead,
    review: {
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: 'Editor Vetor',
      },
      reviewBody: buildReviewBody(review),
    },
  };

  if (review.image_url) {
    schema.image = review.image_url;
  }

  const reviewNode = schema.review as Record<string, unknown>;

  if (score !== null) {
    reviewNode.reviewRating = {
      '@type': 'Rating',
      ratingValue: String(score),
      bestRating: '5',
    };
  }

  if (price !== null) {
    schema.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'BRL',
      ...(review.affiliate_url
        ? {
            url: review.affiliate_url,
            availability: 'https://schema.org/InStock',
          }
        : {}),
    };
  }

  if (score !== null && Number.isFinite(reviewCount) && reviewCount > 1) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(score),
      bestRating: '5',
      ratingCount: String(reviewCount),
    };
  }

  return schema;
}

export function generateViralArticleSchema(article: ViralArticle): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    author: {
      '@type': 'Person',
      name: 'Editor Vetor',
    },
    publisher: {
      '@type': 'Organization',
      name: 'vetor.blog',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: article.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          url: `${SITE_URL}/reviews/${product.slug}`,
          image: product.imageUrl,
        },
      })),
    },
  };
}

export function generateOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'vetor.blog',
    url: SITE_URL,
    description: 'Reviews profissionais, comparativos e recomendações de compra.',
    sameAs: [],
    logo: `${SITE_URL}/favicon.ico`,
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateItemListSchema(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'vetor.blog',
    url: SITE_URL,
  };
}
