import type { ReviewData } from './types';
import { getAuthorSchema } from './author';
import { NEXT_PUBLIC_SITE_URL as RAW_SITE_URL } from '@/lib/env';

const SITE_URL = RAW_SITE_URL.startsWith('http') ? RAW_SITE_URL : `https://${RAW_SITE_URL}`;
const SITE_NAME = 'Vetor Blog';

const categoryMetaDescriptions: Record<string, string> = {
  'wearables-smartbands': 'Reviews de smartbands e smartwatches para saúde, fitness e estilo. Comparativos e análise de custo-benefício.',
  'acessorios-para-games': 'Controles, headsets, cadeiras gamers e acessórios para PC e console. Testes detalhados de desempenho.',
  'notebooks': 'Notebooks para trabalho, estudo, games e produção. Análises de processador, GPU, tela e bateria.',
  'audio-profissional': 'Microfones, fones de ouvido, interfaces de áudio e equipamentos de estúdio para profissionais e amadores.',
  'smartphones': 'Reviews de smartphones, celulares e acessórios. Câmera, bateria, performance e custo-benefício.',
  'tablets': 'Reviews de tablets para trabalho, estudo e lazer. Comparativos de tela, armazenamento e autonomia.',
  'eletroportateis': 'Liquidificadores, air fryers, aspiradores de pó e eletrodomésticos para o dia a dia.',
  'casa-inteligente': 'Dispositivos smart home, interruptores inteligentes, lâmpadas e câmeras de segurança residencial.',
  'cameras-de-seguranca': 'Câmeras IP, sistemas de monitoramento e alarmes. Testes de qualidade de imagem e aplicativo.',
  'fones-de-ouvido': 'Fones de ouvido, earbuds e headsets. Análise de qualidade de som, conforto e cancelamento de ruído.',
  'geral': 'Reviews diversos de produtos de tecnologia e eletrônicos. Análises imparciais e testes reais.',
};

export function getCategoryDescription(slug: string): string {
  return categoryMetaDescriptions[slug] || 'Reviews de produtos de tecnologia. Análises imparciais e testes reais.';
}

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
  const priceRaw = review.priceNew
    ? review.priceNew.replace(/[^\d,]/g, '').replace(',', '.')
    : '';
  const price = priceRaw && parseFloat(priceRaw) > 0 ? priceRaw : '1';

  const overallScore = review.hero.overallScore || 1;
  const schemaRatingCount = review.schemaRating?.reviewCount || 1;

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name:        review.product,
    image:       review.imageUrl || `${SITE_URL}/og-default.jpg`,
    description: review.meta.description,
    brand:       { '@type': 'Brand', name: review.product.split(' ')[0] },
    review: {
      '@type': 'Review',
      itemReviewed: {
        '@type': 'Product',
        name: review.product,
      },
      reviewRating: {
        '@type':      'Rating',
        ratingValue:  overallScore,
        bestRating:   10,
        worstRating:  1,
      },
      author: { '@type': 'Person', name: 'Henrique Vetor' },
    },
    aggregateRating: {
      '@type':       'AggregateRating',
      ratingValue:   overallScore,
      reviewCount:   schemaRatingCount,
      bestRating:    10,
      worstRating:   1,
    },
    offers: {
      '@type':         'Offer',
      url:             review.affiliateUrl || `${SITE_URL}/review/${review.slug}`,
      priceCurrency:   'BRL',
      price:           price,
      availability:    'https://schema.org/InStock',
      returnFees:      'https://schema.org/FreeReturn',
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 30,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'BR',
        },
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'BRL',
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

export function buildStandaloneReviewSchema(review: ReviewData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: review.product,
      image: review.imageUrl || `${SITE_URL}/og-default.jpg`,
      brand: { '@type': 'Brand', name: review.product.split(' ')[0] },
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.hero.overallScore || 1,
      bestRating: 10,
      worstRating: 1,
    },
    author: {
      '@type': 'Person',
      name: 'Henrique Vetor',
    },
    reviewBody: review.hero.lead,
    datePublished: review.createdAt,
    dateModified: review.updatedAt,
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
