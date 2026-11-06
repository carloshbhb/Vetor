import assert from 'node:assert/strict';
import {
  normalizeItemId,
  extractItemId,
  collectMlReviewSlugsToPublish,
  publishMlReviews,
  publishMlReviewsFromData,
} from './publish-ml-reviews';

// normalizeItemId pattern
assert.equal(normalizeItemId('MLB-123456'), 'MLB123456', 'normalizeItemId should strip hyphen');
assert.equal(normalizeItemId('mlb999'), 'MLB999', 'normalizeItemId should be case-insensitive');
assert.equal(normalizeItemId('slug-mlb42-review'), 'MLB42', 'normalizeItemId should extract from slug');
assert.equal(normalizeItemId('https://x/MLB777'), 'MLB777', 'normalizeItemId should extract from url');
assert.equal(normalizeItemId(null), '', 'normalizeItemId should handle null');
assert.equal(extractItemId('MLB1'), 'MLB1', 'extractItemId alias');

// Pure collection
const drafts = [
  { slug: 'review-echo-dot', status: 'draft', affiliate_url: 'https://ml/MLB111' },
  { slug: 'review-other', status: 'draft', affiliate_url: 'https://ml/MLB999' },
  { slug: 'review-published', status: 'published', affiliate_url: 'https://ml/MLB111' },
];
const listItems = [{ item_id: 'MLB111' }];
const slugs = collectMlReviewSlugsToPublish(drafts, listItems);
assert.deepEqual(slugs, ['review-echo-dot'], 'only matching draft should be selected');
assert.deepEqual(publishMlReviewsFromData(drafts, listItems), ['review-echo-dot']);

// Fake supabase
function createFakeSupabase(listIds: string[], drafts: Array<{ slug: string; affiliate_url: string }>) {
  const updates: Array<{ table: string; patch: any; slug: string }> = [];
  const client: any = {
    from(table: string) {
      if (table === 'ml_social_list_items') {
        return {
          select() {
            return Promise.resolve({ data: listIds.map((id) => ({ item_id: id })), error: null });
          },
        };
      }
      if (table === 'reviews') {
        return {
          select() {
            const builder: any = {
              eq(_col: string, _val: string) {
                return Promise.resolve({ data: drafts.map((d) => ({ ...d, status: 'draft' })), error: null });
              },
            };
            // support chained .eq then await
            const p = Promise.resolve({ data: drafts.map((d) => ({ ...d, status: 'draft' })), error: null });
            builder.then = p.then.bind(p);
            return builder;
          },
          update(patch: any) {
            return {
              eq(_col: string, slug: string) {
                updates.push({ table, patch, slug });
                return Promise.resolve({ data: [{ slug }], error: null });
              },
            };
          },
        };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    },
  };
  return { client, updates };
}

async function runDbChecks(): Promise<void> {
  const fake = createFakeSupabase(['MLB111'], [
    { slug: 'review-echo-dot', affiliate_url: 'https://ml/MLB111' },
    { slug: 'review-other', affiliate_url: 'https://ml/MLB999' },
  ]);
  const summary = await publishMlReviews(fake.client);
  assert.equal(summary.published, 1, 'one review should be published');
  assert.deepEqual(summary.publishedSlugs, ['review-echo-dot']);
  assert.equal(fake.updates.length, 1, 'one update call');
  assert.equal(fake.updates[0].patch.status, 'published');
  assert.equal(fake.updates[0].slug, 'review-echo-dot');

  // dry run should not update
  const fake2 = createFakeSupabase(['MLB111'], [{ slug: 'review-echo-dot', affiliate_url: 'https://ml/MLB111' }]);
  const summary2 = await publishMlReviews(fake2.client, { dryRun: true });
  assert.equal(summary2.published, 1);
  assert.equal(fake2.updates.length, 0, 'dry run should not update');
}

runDbChecks().then(() => console.log('publish-ml-reviews tests passed'));