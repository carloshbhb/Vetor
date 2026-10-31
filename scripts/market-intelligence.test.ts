import assert from 'node:assert/strict';
import { demandScore, routeFor } from '../src/lib/market-intelligence';
import { getAllReviews } from '../src/lib/supabase';

type ReviewRows = Awaited<ReturnType<typeof getAllReviews>>;
const reviews = [
  { slug: 'samsung-galaxy-fit3', product: 'Samsung Galaxy Fit3', category: 'Wearables' },
  { slug: 'sony-wf-1000xm5', product: 'Sony WF-1000XM5', category: 'Fones de Ouvido' },
  { slug: 'iphone-15', product: 'iPhone 15', category: 'Smartphones' },
] as unknown as ReviewRows;

assert.equal(demandScore(0), 5, 'zero impressions must not be scored as meaningful demand');
assert.ok(demandScore(1) > 5 && demandScore(1) < 25, 'one impression must remain low demand');
assert.ok(demandScore(100) > demandScore(1), 'demand score must increase with absolute impressions');
assert.ok(demandScore(1000) > demandScore(100), 'demand score must preserve the absolute scale');

assert.equal(
  routeFor('melhores fones de ouvido', reviews),
  '/melhores/fones-de-ouvido/',
  'generic best-category query must route to the buying guide, not an individual review'
);
assert.equal(
  routeFor('review Samsung Galaxy Fit3', reviews),
  '/reviews/samsung-galaxy-fit3/',
  'exact product review query must route to its matching review'
);
assert.equal(
  routeFor('melhores smartphones', reviews),
  '/melhores/smartphones/',
  'smartphone category query must resolve to the existing category guide'
);
assert.equal(routeFor('termo genérico sem página correspondente', reviews), '', 'unmatched terms must not invent a route');

console.log('market intelligence tests passed');
