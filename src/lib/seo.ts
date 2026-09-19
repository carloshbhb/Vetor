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

export function generateReviewSchema(review: Review): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: review.product,
    image: review.image_url,
    description: review.hero_lead,
    brand: {
      '@type': 'Brand',
      name: review.category,
    },
    offers: {
      '@type': 'Offer',
      price: review.price_new?.replace(/[^0-9.,]/g, '') || '0',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
    },
    review: {
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: 'Editor Vetor',
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: String(review.schema_rating_value ?? 0),
        bestRating: '5',
      },
      reviewBody: review.hero_lead || '',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(review.schema_rating_value ?? 0),
      bestRating: '5',
      ratingCount: String(review.schema_review_count ?? 1),
    },
  };
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
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
