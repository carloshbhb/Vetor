import type { ReviewData } from './types';
import { getAuthorSchema } from './author';

const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const SITE_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;
const SITE_NAME = 'Vetor Blog';

// Shared slugify for category slugs
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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
  const { meta, slug, imageUrl } = review;
  const url    = `${SITE_URL}/review/${slug}`;
  const ogImage = meta.ogImage || imageUrl || `${SITE_URL}/og-default.jpg`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical || url },
    openGraph: {
      type:        'article' as const,
      url,
      title:       meta.title,
      description: meta.description,
      siteName:    SITE_NAME,
      images:      [{ url: ogImage, width: 1200, height: 630, alt: meta.title }],
      publishedTime: review.createdAt,
      modifiedTime: review.updatedAt,
      authors: ['Henrique Vetor'],
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
  const price = review.priceNew
    ? review.priceNew.replace(/[^\d,]/g, '').replace(',', '.')
    : '0';

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
        ratingValue:  review.hero.overallScore || 0,
        bestRating:   10,
        worstRating:  1,
      },
      author: { '@type': 'Person', name: 'Henrique Vetor' },
    },
    aggregateRating: {
      '@type':       'AggregateRating',
      ratingValue:   review.schemaRating?.ratingValue || 0,
      reviewCount:   review.schemaRating?.reviewCount || 1,
      bestRating:    10,
      worstRating:   1,
    },
    offers: {
      '@type':         'Offer',
      url:             review.affiliateUrl || `${SITE_URL}/review/${review.slug}`,
      priceCurrency:   'BRL',
      price:           price || '0',
      availability:    'https://schema.org/InStock',
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 30,
        returnMethod: 'https://schema.org/ReturnByMail',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'BR',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'd',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 3,
            maxValue: 10,
            unitCode: 'd',
          },
        },
      },
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
  const categorySlug = (review.category || 'Geral').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início',  item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: review.category || 'Geral', item: `${SITE_URL}/categoria/${categorySlug}` },
      { '@type': 'ListItem', position: 3, name: review.product, item: `${SITE_URL}/review/${review.slug}` },
    ],
  };
}

// Export slugify for external use
export { slugify };
