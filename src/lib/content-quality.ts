import { z } from 'zod';

export const generatedReviewQualitySchema = z
  .object({
    product: z.string().trim().min(1, 'product is required'),
    category: z.string().trim().min(1, 'category is required'),
    sections: z.array(z.any()),
    hero_lead: z.string(),
    hero_overall_score: z.number().min(0).max(10).optional(),
    verdict_score: z.number().min(0).max(10).optional(),
  })
  .superRefine((val, ctx) => {
    const sectionsOk =
      val.sections.length >= 3 ||
      (val.hero_lead.trim().length > 0 && val.sections.length >= 1);
    if (!sectionsOk) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message:
          'sections must have length >= 3, or length >= 1 with a non-empty hero_lead',
      });
    }
  });

export type GeneratedReviewQualityInput = z.input<typeof generatedReviewQualitySchema>;

export function validateGeneratedReview(
  payload: GeneratedReviewQualityInput,
  meta: { source: 'admin' | 'cron'; slug?: string }
): { ok: true; issues: [] } | { ok: false; issues: string[] } {
  const result = generatedReviewQualitySchema.safeParse(payload);
  if (result.success) {
    return { ok: true, issues: [] };
  }

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });

  console.error(
    '[quality-gate] review_validation_failed',
    JSON.stringify({ source: meta.source, slug: meta.slug ?? null, issues })
  );

  return { ok: false, issues };
}
