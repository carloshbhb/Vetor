import { getSupabaseServiceKeyClient } from '../src/lib/supabase';

export type ReviewDraft = {
  slug?: string | null;
  status?: string | null;
  affiliate_url?: string | null;
};

export type MlSocialListItem = {
  item_id?: string | null;
};

/**
 * Normalize a Mercado Livre item id from arbitrary text (slug, URL, source ref).
 * Matches the MLB-?(\d+) pattern used across the refill pipeline.
 */
export function normalizeItemId(value: unknown): string {
  const match = String(value || '').match(/MLB-?(\d+)/i);
  return match ? 'MLB' + match[1] : '';
}

export function extractItemIdFromReview(review: ReviewDraft): string {
  return normalizeItemId(review?.slug) || normalizeItemId(review?.affiliate_url);
}

export function extractItemId(value: unknown): string {
  return normalizeItemId(value);
}

/**
 * Pure helper: given draft reviews and ML social list items, return the slugs
 * that should be flipped from draft to published.
 */
export function collectMlReviewSlugsToPublish(
  drafts: ReviewDraft[],
  listItems: MlSocialListItem[],
  socialReviewSlugs: string[] = [],
): string[] {
  const listIds = new Set(
    (listItems || [])
      .map((item) => normalizeItemId(item?.item_id))
      .filter((id): id is string => Boolean(id)),
  );
  const socialSlugs = new Set((socialReviewSlugs || []).filter(Boolean));
  const slugs: string[] = [];
  for (const review of drafts || []) {
    if (String(review?.status || '').toLowerCase() !== 'draft') continue;
    const itemId = extractItemIdFromReview(review);
    if (review?.slug && ((itemId && listIds.has(itemId)) || socialSlugs.has(String(review.slug)))) {
      slugs.push(String(review.slug));
    }
  }
  return slugs;
}

export type PublishSummary = {
  published: number;
  publishedSlugs: string[];
  totalDrafts: number;
  totalListItems: number;
};

/**
 * DB-backed publisher. Accepts an optional Supabase client (injected for tests).
 */
export async function publishMlReviews(
  supabase?: any,
  options?: { dryRun?: boolean },
): Promise<PublishSummary> {
  const client = supabase ?? getSupabaseServiceKeyClient();
  if (!client) {
    throw new Error('Supabase service client not configured');
  }
  const dryRun = Boolean(options?.dryRun);

  const { data: listRows, error: listError } = await client
    .from('ml_social_list_items')
    .select('item_id');
  if (listError) throw new Error('Failed to read ml_social_list_items: ' + listError.message);

  const [{ data: draftRows, error: draftError }, { data: linkedProducts, error: linksError }] = await Promise.all([
    client.from('reviews').select('slug,status,affiliate_url').eq('status', 'draft'),
    client.from('product_links').select('review_slug,tags,notes').not('review_slug', 'is', null).limit(2000),
  ]);
  if (draftError) throw new Error('Failed to read draft reviews: ' + draftError.message);
  if (linksError) throw new Error('Failed to read Social List review relationships: ' + linksError.message);

  const drafts = (draftRows || []) as ReviewDraft[];
  const listItems = (listRows || []) as MlSocialListItem[];
  const socialReviewSlugs = (linkedProducts || [])
    .filter((row: any) => {
      const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
      const notes = String(row.notes || '');
      return tags.includes('ml-social-list') || /ml_social_list:|Origem:\s*ml-lista-/i.test(notes);
    })
    .map((row: any) => String(row.review_slug || '').trim())
    .filter(Boolean);
  const slugsToPublish = collectMlReviewSlugsToPublish(drafts, listItems, socialReviewSlugs);

  if (!dryRun) {
    for (const slug of slugsToPublish) {
      const { error: updateError } = await client
        .from('reviews')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('slug', slug);
      if (updateError) throw new Error('Failed to publish ' + slug + ': ' + updateError.message);
    }
  }

  return {
    published: slugsToPublish.length,
    publishedSlugs: slugsToPublish,
    totalDrafts: drafts.length,
    totalListItems: new Set(listItems.map((i) => normalizeItemId(i?.item_id)).filter(Boolean)).size,
  };
}

// Aliases for compatibility with possible callers/tests.
export const publish = publishMlReviews;
export const publishDraftMlReviews = publishMlReviews;
export const publishMlReviewDrafts = publishMlReviews;
export const runPublish = publishMlReviews;
export const publishMlReviewsFromData = (drafts: ReviewDraft[], listItems: MlSocialListItem[]) =>
  collectMlReviewSlugsToPublish(drafts, listItems);

export default publishMlReviews;

async function main(): Promise<void> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    console.error('Supabase service client not configured; aborting.');
    process.exit(1);
  }
  const summary = await publishMlReviews(supabase);
  console.log(JSON.stringify({ event: 'publish-ml-reviews', ...summary }));
}

const isDirectRun = (() => {
  try {
    const entry = process.argv[1];
    return typeof entry === 'string' && entry.replace(/\\\\/g, '/').endsWith('publish-ml-reviews.ts');
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
