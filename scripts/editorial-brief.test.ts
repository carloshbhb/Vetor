import assert from 'node:assert/strict';
import {
  buildDefaultComparativeEditorialBrief,
  buildDefaultReviewEditorialBrief,
  buildReviewPrompt,
  buildViralPrompt,
} from '../src/lib/prompt';
import { slugifyEditorialTitle } from '../src/lib/slug';

const reviewBrief = buildDefaultReviewEditorialBrief({ title: 'Samsung Galaxy Fit3', category: 'Wearables' });
assert.equal(reviewBrief.primaryKeyword, 'Samsung Galaxy Fit3');
assert.equal(reviewBrief.searchIntent, 'commercial');
assert.match(reviewBrief.searchQuestion || '', /vale a pena/i);

const reviewPrompt = buildReviewPrompt({
  title: 'Samsung Galaxy Fit3',
  category: 'Wearables',
  price: 'R$ 199',
  image: 'https://example.com/product.webp',
  editorialBrief: {
    ...reviewBrief,
    primaryKeyword: 'Samsung Galaxy Fit3 vale a pena',
    keywordEvidence: [{
      keyword: 'Samsung Galaxy Fit3 vale a pena',
      impressions: 34,
      clicks: 2,
      ctr: 0.0588,
      position: 11.4,
      opportunityScore: 73,
      sources: ['search_console'],
      period: '2026-09-01 a 2026-09-30',
    }],
  },
});
assert.ok(reviewPrompt.includes('Palavra-chave principal: Samsung Galaxy Fit3 vale a pena'));
assert.ok(reviewPrompt.includes('SINAIS DE PESQUISA REAL DO VETOR'));
assert.ok(reviewPrompt.includes('impressões no Search Console=34'));
assert.ok(reviewPrompt.includes('nunca apresentar como volume geral de busca'));
assert.ok(reviewPrompt.includes('https://www.vetor.blog/reviews/'));

const products = [
  { name: 'Galaxy S24', slug: 'galaxy-s24', imageUrl: 'https://example.com/s24.webp' },
  { name: 'iPhone 15', slug: 'iphone-15', imageUrl: 'https://example.com/iphone.webp' },
];
const title = 'Galaxy S24 vs iPhone 15: qual escolher?';
const comparativeBrief = buildDefaultComparativeEditorialBrief({ title, category: 'Smartphones', comparisonProducts: products });
const comparativePrompt = buildViralPrompt({
  title,
  category: 'Smartphones',
  comparisonProducts: products,
  editorialBrief: {
    ...comparativeBrief,
    primaryKeyword: title,
    keywordEvidence: [{
      keyword: 'Galaxy S24 vs iPhone 15',
      impressions: 100,
      clicks: 5,
      ctr: 0.05,
      position: 8.2,
      opportunityScore: 82,
      sources: ['search_console'],
    }],
  },
});
assert.ok(comparativePrompt.includes('Palavra-chave principal: ' + title));
assert.ok(comparativePrompt.includes('Pergunta principal: Qual escolher entre Galaxy S24 e iPhone 15?'));
assert.ok(comparativePrompt.includes('SINAIS DE PESQUISA REAL DO VETOR'));
assert.ok(comparativePrompt.includes('impressões=100'));
assert.ok(comparativePrompt.includes('https://www.vetor.blog/comparativos/'));

assert.equal(slugifyEditorialTitle('Samsung Galaxy Fit3: vale a pena?'), 'samsung-galaxy-fit3-vale-a-pena');
assert.equal(slugifyEditorialTitle('Fones de Ouvido — Áudio Premium'), 'fones-de-ouvido-audio-premium');
assert.equal(slugifyEditorialTitle('  Modelo---Novo  '), 'modelo-novo');

console.log('editorial brief and slug tests passed');
