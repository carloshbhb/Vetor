import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const supabase = read('src/lib/supabase.ts');
const data = read('src/lib/data.ts');
const publicData = read('src/lib/public-data.ts');
const invalidation = read('src/lib/revalidate-content.ts');
const home = read('src/app/page.tsx');
const admin = read('src/app/admin/page.tsx');
const slugReader = data.match(/export async function fetchReviewBySlug[\s\S]*?\n}\n/);

const match = supabase.match(/const REVIEW_SUMMARY_COLUMNS\s*=\s*'([^']+)'/);
assert.ok(match, 'REVIEW_SUMMARY_COLUMNS must be defined');
const columns = match[1].split(',');
for (const column of ['slug','status','product','category','image_url','meta_title','meta_keywords','hero_lead','verdict_score','created_at','updated_at']) {
  assert.ok(columns.includes(column), 'summary projection includes ' + column);
}
for (const column of ['hero_bars','specs','sections','compare_table','pros','cons','testimonials','faq','schema_rating_value','schema_review_count','google_rank','last_rank_check']) {
  assert.ok(!columns.includes(column), 'summary projection excludes ' + column);
}
const query = supabase.match(/export async function getAllReviewSummaries[\s\S]*?\n}\n/);
assert.ok(query, 'getAllReviewSummaries exists');
assert.match(query[0], /\.select\(REVIEW_SUMMARY_COLUMNS\)/);
assert.match(query[0], /\.eq\('content_type', contentType\)/);
assert.match(query[0], /\.eq\('status', 'published'\)/);
assert.doesNotMatch(data, /from ['"]next\/cache['"]/);
assert.ok(slugReader, 'fetchReviewBySlug exists');
assert.doesNotMatch(slugReader[0], /getAllReviews\(/, 'a missing slug must not trigger a full catalog read');
assert.match(publicData, /import 'server-only'/);
assert.match(publicData, /unstable_cache/);
assert.match(invalidation, /vetor:reviews:summary/);
assert.match(invalidation, /vetor:comparatives:summary/);
assert.match(home, /fetchAllReviewSummaries/);
assert.doesNotMatch(home, /fetchAllReviews|fetchGuias/);
assert.match(admin, /@\/lib\/data/);
assert.doesNotMatch(admin, /public-data/);
console.log('Supabase egress/cache regression tests passed.');
