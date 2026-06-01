import type { ReviewData } from './types';
import { getAuthorSchema } from './author';

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
const SITE_NAME = 'Vetor Blog';

// ─── NewsArticle Schema (PR Digital / Google News) ──────────────────────────
export function buildNewsArticleSchema(review: ReviewData) {
  const url = `${SITE_URL}/review/${review.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: review.meta.title,
    description: review.meta.description,
    image: review.imageUrl || `${SITE_URL}/og-default.jpg`,
    url,
    datePublished: review.createdAt,
    dateModified: review.updatedAt,
    author: getAuthorSchema(),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: review.meta.keywords,
    articleSection: review.category,
    wordCount: review.sections.reduce((acc, s) => acc + s.content.split(' ').length, 0),
  };
}

// ─── Metadata (Next.js Metadata API) ────────────────────────────────────────

export function buildReviewMetadata(review: ReviewData) {
  const { meta, slug, hero, imageUrl } = review;
  const url    = `${SITE_URL}/review/${slug}`;
  const ogImage = meta.ogImage || imageUrl || `${SITE_URL}/og-default.jpg`;

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: meta.canonical || url },
    openGraph: {
      type:        'article' as const,
      url,
      title:       meta.title,
      description: meta.description,
      siteName:    SITE_NAME,
      images:      [{ url: ogImage, width: 1200, height: 630, alt: meta.title }],
    },
    twitter: {
      card:        'summary_large_image' as const,
      title:       meta.title,
      description: meta.description,
      images:      [ogImage],
    },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  };
}

// ─── JSON-LD Schemas ─────────────────────────────────────────────────────────

export function buildArticleSchema(review: ReviewData) {
  const url = `${SITE_URL}/review/${review.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline:      review.meta.title,
    description:   review.meta.description,
    image:         review.imageUrl || `${SITE_URL}/og-default.jpg`,
    url,
    datePublished: review.createdAt,
    dateModified:  review.updatedAt,
    author:        getAuthorSchema(),
    publisher:     {
      '@type': 'Organization',
      name:    SITE_NAME,
      logo:    { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
  };
}

export function buildProductSchema(review: ReviewData) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name:        review.product,
    image:       review.imageUrl || `${SITE_URL}/og-default.jpg`,
    description: review.meta.description,
    brand:       { '@type': 'Brand', name: review.product.split(' ')[0] },
    review: {
      '@type': 'Review',
      reviewRating: {
        '@type':      'Rating',
        ratingValue:  review.hero.overallScore,
        bestRating:   10,
        worstRating:  0,
      },
      author: { '@type': 'Organization', name: SITE_NAME },
    },
    aggregateRating: {
      '@type':       'AggregateRating',
      ratingValue:   review.schemaRating.ratingValue,
      reviewCount:   review.schemaRating.reviewCount,
      bestRating:    5,
      worstRating:   1,
    },
    offers: {
      '@type':         'Offer',
      url:             review.affiliateUrl,
      priceCurrency:   'BRL',
      price:           review.priceNew.replace(/[^\d,]/g, '').replace(',', '.'),
      availability:    'https://schema.org/InStock',
    },
  };
}

export function buildFAQSchema(review: ReviewData) {
  if (!review.faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: review.faq.map(item => ({
      '@type': 'Question',
      name:    item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function buildBreadcrumbSchema(review: ReviewData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início',  item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Reviews', item: SITE_URL },
      { '@type': 'ListItem', position: 3, name: review.product, item: `${SITE_URL}/review/${review.slug}` },
    ],
  };
}
