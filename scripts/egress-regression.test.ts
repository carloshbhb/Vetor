import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const supabase = read('src/lib/supabase.ts');
const data = read('src/lib/data.ts');
const publicData = read('src/lib/public-data.ts');
const invalidation = read('src/lib/revalidate-content.ts');
const home = read('src/app/page.tsx');
const admin = read('src/app/admin/page.tsx');
const buying = read('src/lib/buying.ts');
const affiliates = read('src/lib/affiliate-links.ts');
const reviewDetail = read('src/app/reviews/[slug]/page.tsx');
const comparativeDetail = read('src/app/comparativos/[slug]/page.tsx');
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
assert.ok(buying.includes("replace(/\\/+$/, '')"), 'image URL normalization regex must remain valid');
assert.match(buying, /buildBuyingIntentPages\(\s*reviews: ReviewSummary\[\]/);
assert.doesNotMatch(buying, /reviewSearchCorpus\(review: Review\):[\s\S]{0,220}review\.sections/);
const affiliateNameLookup = affiliates.match(/export async function getAffiliateLinksForProductNames[\s\S]*?\n}\n/);
assert.ok(affiliateNameLookup, 'affiliate name lookup exists');
assert.doesNotMatch(affiliateNameLookup[0], /offset \+= 500/, 'affiliate lookup must not scan the full table');
assert.match(affiliateNameLookup[0], /\.or\(filters\.join/);
assert.match(reviewDetail, /fetchAllReviewSummaries\(\)/);
assert.doesNotMatch(reviewDetail, /fetchAllReviews\(\)|fetchAllLandingPages\(\)/);
assert.match(reviewDetail, /fetchAffiliateLinksForProductNames/);
assert.match(comparativeDetail, /fetchAllViralArticleSummaries/);
assert.doesNotMatch(comparativeDetail, /fetchAllViralArticles\(\)|fetchAllReviews\(\)|fetchReviewBySlug\(/);
assert.match(publicData, /vetor-public-affiliate-links-by-review-v1/);
assert.match(publicData, /vetor-public-product-links-by-review-v1/);
console.log('Supabase egress/cache regression tests passed.');
