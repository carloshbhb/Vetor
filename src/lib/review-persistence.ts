export const REVIEW_PATCHABLE_FIELDS = [
  'content_type', 'product', 'category', 'price_new', 'image_url',
  'meta_title', 'meta_description', 'pros', 'cons', 'hero_overall_score',
  'verdict_score', 'marketplace', 'affiliate_url', 'hero_bars', 'specs',
  'sections', 'compare_table', 'verdict_label', 'verdict_text', 'verdict_note',
  'hero_lead', 'hero_headline_line1', 'hero_headline_line2', 'hero_headline_em',
  'faq',
] as const;

/**
 * Build a PATCH payload from explicitly supplied fields only.
 * Omitted editorial fields must never be overwritten by fallback defaults.
 */
export function buildReviewUpdatePayload(
  data: Record<string, unknown>,
  updatedAt: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { updated_at: updatedAt };

  for (const field of REVIEW_PATCHABLE_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field];
  }

  if (data.hero_overall_score !== undefined) {
    payload.schema_rating_value = data.hero_overall_score;
  }

  return payload;
}

/** Insert on explicit insert-only requests or when the slug does not exist. */
export function resolveReviewWriteMode(
  insertOnly: boolean,
  existingRecord: boolean,
): 'insert' | 'update' {
  return insertOnly || !existingRecord ? 'insert' : 'update';
}
