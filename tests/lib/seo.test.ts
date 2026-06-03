import { describe, it, expect } from 'vitest';
import {
  buildArticleSchema,
  buildProductSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
  buildReviewMetadata,
  buildNewsArticleSchema,
} from '@/lib/seo';
import type { ReviewData } from '@/lib/types';

const mockReview: ReviewData = {
  id: '1',
  slug: 'samsung-galaxy-fit3',
  status: 'published',
  meta: {
    title: 'Samsung Galaxy Fit3 Vale a Pena? Review Completo 2026',
    description: 'Review honesto do Samsung Galaxy Fit3 com prós, contras e nota rigorosa.',
    keywords: 'samsung galaxy fit3, smartband, review',
    readingTime: 7,
  },
  product: 'Samsung Galaxy Fit3',
  category: 'Smartband',
  marketplace: 'Mercado Livre',
  priceOld: 'R$ 399,00',
  priceNew: 'R$ 249,00',
  affiliateUrl: 'https://www.mercadolivre.com.br/samsung-galaxy-fit3',
  imageUrl: 'https://example.com/galaxy-fit3.jpg',
  adsEnabled: false,
  hero: {
    headlineLine1: 'SAMSUNG GALAXY FIT3',
    headlineLine2: 'VALE A PENA EM 2026?',
    headlineEm: 'GALAXY FIT3',
    lead: 'Análise completa da smartband da Samsung.',
    overallScore: 8.5,
    bars: [
      { label: 'Tela', value: 9.0, pct: 90 },
      { label: 'Bateria', value: 8.0, pct: 80 },
    ],
  },
  specs: [
    { label: 'Tela', value: 'AMOLED 1.6"' },
    { label: 'Bateria', value: '300mAh' },
  ],
  sections: [
    { id: 'tela', heading: 'Tela e Display', tocLabel: 'Tela', tocEmoji: '📺', content: 'Conteúdo sobre a tela.' },
  ],
  compareTable: {
    caption: 'Comparativo',
    columns: ['Galaxy Fit3', 'Mi Band 8'],
    winnerCol: 1,
    rows: [],
  },
  pros: ['Ótima tela', 'Bateria boa'],
  cons: ['Sem NFC'],
  testimonials: [],
  verdict: {
    score: 8.5,
    label: 'EXCELENTE CUSTO-BENEFÍCIO',
    text: 'Recomendamos o Galaxy Fit3.',
    note: 'Para quem busca smartband',
  },
  faq: [
    { question: 'Vale a pena?', answer: 'Sim, é uma ótima opção.' },
  ],
  schemaRating: { ratingValue: 4.5, reviewCount: 5000 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('SEO Schemas', () => {
  describe('buildArticleSchema', () => {
    it('returns valid Article schema', () => {
      const schema = buildArticleSchema(mockReview);
      expect(schema['@type']).toBe('Article');
      expect(schema.headline).toBe(mockReview.meta.title);
      expect(schema.description).toBe(mockReview.meta.description);
      expect(schema.url).toContain(mockReview.slug);
      expect(schema.datePublished).toBe(mockReview.createdAt);
    });

    it('includes author and publisher', () => {
      const schema = buildArticleSchema(mockReview);
      expect(schema.author).toBeDefined();
      expect(schema.publisher['@type']).toBe('Organization');
      expect(schema.publisher.name).toBe('Vetor Blog');
    });

    it('uses fallback image when none provided', () => {
      const reviewWithoutImage = { ...mockReview, imageUrl: '' };
      const schema = buildArticleSchema(reviewWithoutImage);
      expect(schema.image).toContain('og-default.jpg');
    });
  });

  describe('buildProductSchema', () => {
    it('returns valid Product schema', () => {
      const schema = buildProductSchema(mockReview);
      expect(schema['@type']).toBe('Product');
      expect(schema.name).toBe(mockReview.product);
      expect(schema.description).toBe(mockReview.meta.description);
    });

    it('includes aggregate rating', () => {
      const schema = buildProductSchema(mockReview);
      expect(schema.aggregateRating['@type']).toBe('AggregateRating');
      expect(schema.aggregateRating.ratingValue).toBe(4.5);
      expect(schema.aggregateRating.reviewCount).toBe(5000);
    });

    it('includes offer with BRL currency', () => {
      const schema = buildProductSchema(mockReview);
      expect(schema.offers['@type']).toBe('Offer');
      expect(schema.offers.priceCurrency).toBe('BRL');
      expect(schema.offers.url).toBe(mockReview.affiliateUrl);
    });

    it('includes review rating', () => {
      const schema = buildProductSchema(mockReview);
      expect(schema.review.reviewRating.ratingValue).toBe(8.5);
      expect(schema.review.reviewRating.bestRating).toBe(10);
    });
  });

  describe('buildFAQSchema', () => {
    it('returns valid FAQ schema', () => {
      const schema = buildFAQSchema(mockReview);
      expect(schema).not.toBeNull();
      expect(schema!['@type']).toBe('FAQPage');
      expect(schema!.mainEntity).toHaveLength(1);
    });

    it('returns null for empty FAQ', () => {
      const reviewWithoutFaq = { ...mockReview, faq: [] };
      const schema = buildFAQSchema(reviewWithoutFaq);
      expect(schema).toBeNull();
    });

    it('includes question and answer', () => {
      const schema = buildFAQSchema(mockReview);
      expect(schema!.mainEntity[0]['@type']).toBe('Question');
      expect(schema!.mainEntity[0].name).toBe('Vale a pena?');
      expect(schema!.mainEntity[0].acceptedAnswer.text).toBe('Sim, é uma ótima opção.');
    });
  });

  describe('buildBreadcrumbSchema', () => {
    it('returns valid BreadcrumbList schema', () => {
      const schema = buildBreadcrumbSchema(mockReview);
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(3);
    });

    it('includes correct positions', () => {
      const schema = buildBreadcrumbSchema(mockReview);
      expect(schema.itemListElement[0].name).toBe('Início');
      expect(schema.itemListElement[1].name).toBe('Smartband');
      expect(schema.itemListElement[2].name).toBe('Samsung Galaxy Fit3');
    });
  });

  describe('buildReviewMetadata', () => {
    it('returns metadata with title and description', () => {
      const metadata = buildReviewMetadata(mockReview);
      expect(metadata.title).toBe(mockReview.meta.title);
      expect(metadata.description).toBe(mockReview.meta.description);
    });

    it('includes Open Graph data', () => {
      const metadata = buildReviewMetadata(mockReview);
      expect(metadata.openGraph.type).toBe('article');
      expect(metadata.openGraph.title).toBe(mockReview.meta.title);
      expect(metadata.openGraph.images).toHaveLength(1);
    });

    it('includes Twitter card data', () => {
      const metadata = buildReviewMetadata(mockReview);
      expect(metadata.twitter.card).toBe('summary_large_image');
      expect(metadata.twitter.title).toBe(mockReview.meta.title);
    });

    it('includes canonical URL', () => {
      const metadata = buildReviewMetadata(mockReview);
      expect(metadata.alternates.canonical).toContain(mockReview.slug);
    });

    it('uses OG image from meta when available', () => {
      const reviewWithOg = {
        ...mockReview,
        meta: { ...mockReview.meta, ogImage: 'https://example.com/og.jpg' },
      };
      const metadata = buildReviewMetadata(reviewWithOg);
      expect(metadata.openGraph.images[0].url).toBe('https://example.com/og.jpg');
    });
  });

  describe('buildNewsArticleSchema', () => {
    it('returns valid NewsArticle schema', () => {
      const schema = buildNewsArticleSchema(mockReview);
      expect(schema['@type']).toBe('NewsArticle');
      expect(schema.headline).toBe(mockReview.meta.title);
      expect(schema.url).toContain(mockReview.slug);
    });

    it('includes word count', () => {
      const schema = buildNewsArticleSchema(mockReview);
      expect(schema.wordCount).toBeGreaterThan(0);
    });

    it('includes articleSection from category', () => {
      const schema = buildNewsArticleSchema(mockReview);
      expect(schema.articleSection).toBe('Smartband');
    });
  });
});
