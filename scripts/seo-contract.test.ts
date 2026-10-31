import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrganizationSchema,
  generateFAQSchema,
  generateReviewSchema,
  resolveOgImage,
} from '../src/lib/seo';
import type { Review } from '../src/lib/types';

test('organization usa entidade #org com logo existente', () => {
  const org = generateOrganizationSchema() as Record<string, unknown>;
  assert.equal(org['@id'], 'https://www.vetor.blog/#org');
  assert.equal(org.logo, 'https://www.vetor.blog/og.png');
});

test('FAQPage espelha o FAQ visível, pergunta por pergunta', () => {
  const faqs = [
    { question: 'X é bom?', answer: 'Sim, para o perfil Y.' },
    { question: 'Quanto custa X?', answer: 'A partir de R$ 100.' },
  ];
  const schema = generateFAQSchema(faqs) as Record<string, unknown>;
  assert.equal(schema['@type'], 'FAQPage');
  const entities = schema.mainEntity as Array<Record<string, unknown>>;
  assert.equal(entities.length, 2);
  assert.equal(entities[0].name, 'X é bom?');
  assert.equal((entities[0].acceptedAnswer as Record<string, unknown>).text, 'Sim, para o perfil Y.');
  assert.equal(entities[1].name, 'Quanto custa X?');
});

test('resolveOgImage cai para /og.png sem imagem própria', () => {
  assert.equal(
    resolveOgImage('https://www.vetor.blog/assets/img/x.jpg'),
    'https://www.vetor.blog/assets/img/x.jpg'
  );
  assert.equal(resolveOgImage(null), 'https://www.vetor.blog/og.png');
  assert.equal(resolveOgImage(undefined), 'https://www.vetor.blog/og.png');
  assert.equal(resolveOgImage(''), 'https://www.vetor.blog/og.png');
});

test('Offer inclui availability somente quando o estoque foi informado e validado', () => {
  const baseReview = {
    slug: 'produto-teste',
    product: 'Produto de teste',
    hero_lead: 'Descrição editorial do produto.',
    price_new: 'R$ 199,90',
    affiliate_url: 'https://example.com/oferta',
    verdict_score: 9,
    hero_overall_score: 9,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-02T00:00:00.000Z',
    pros: [],
    cons: [],
    sections: [],
  } as unknown as Review;

  const unknownAvailability = generateReviewSchema(baseReview);
  const unknownOffer = unknownAvailability.offers as Record<string, unknown>;
  assert.equal(unknownOffer.availability, undefined, 'unknown stock must not be guessed');

  const confirmedAvailability = generateReviewSchema({
    ...baseReview,
    availability: 'https://schema.org/InStock',
  });
  const confirmedOffer = confirmedAvailability.offers as Record<string, unknown>;
  assert.equal(confirmedOffer.availability, 'https://schema.org/InStock');

  const invalidAvailability = generateReviewSchema({
    ...baseReview,
    availability: 'maybe-in-stock' as Review['availability'],
  });
  const invalidOffer = invalidAvailability.offers as Record<string, unknown>;
  assert.equal(invalidOffer.availability, undefined, 'unsupported values must not enter JSON-LD');
});
