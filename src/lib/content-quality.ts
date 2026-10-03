import { z } from 'zod';

const MIN_CONTENT_LENGTH = 3000;
const MIN_HERO_LEAD_LENGTH = 80;
const MIN_SECTIONS = 4;
const MIN_PROS = 3;
const MIN_CONS = 3;
const MIN_FAQ = 3;

function visibleTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

export const generatedReviewQualitySchema = z
  .object({
    product: z.string().trim().min(1, 'product is required'),
    category: z.string().trim().min(1, 'category is required'),
    content: z
      .string()
      .trim()
      .min(MIN_CONTENT_LENGTH, `content must have at least ${MIN_CONTENT_LENGTH} characters`),
    sections: z
      .array(
        z.object({
          heading: z.string().trim().min(4),
          content: z.string().trim().min(120),
        })
      )
      .min(MIN_SECTIONS, `sections must contain at least ${MIN_SECTIONS} substantive sections`),
    hero_lead: z
      .string()
      .trim()
      .min(MIN_HERO_LEAD_LENGTH, `hero_lead must have at least ${MIN_HERO_LEAD_LENGTH} characters`),
    pros: z.array(z.string().trim().min(8)).min(MIN_PROS),
    cons: z.array(z.string().trim().min(8)).min(MIN_CONS),
    faq: z
      .array(
        z.object({
          question: z.string().trim().min(8),
          answer: z.string().trim().min(30),
        })
      )
      .min(MIN_FAQ, `faq must contain at least ${MIN_FAQ} questions`),
    hero_overall_score: z.number().min(0).max(10).optional(),
    verdict_score: z.number().min(0).max(10).optional(),
  })
  .superRefine((val, ctx) => {
    if (visibleTextLength(val.content) < MIN_CONTENT_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: `visible article text must have at least ${MIN_CONTENT_LENGTH} characters`,
      });
    }
    const normalized = val.content.toLowerCase();
    const forbiddenFallbacks = [
      'análise completa do produto',
      'bom custo-benefício',
      'design moderno',
      'boa qualidade de construção',
      'recomendado para quem busca qualidade',
    ];
    for (const phrase of forbiddenFallbacks) {
      if (normalized.includes(phrase)) {
        ctx.addIssue({
          code: 'custom',
          path: ['content'],
          message: `generic fallback phrase detected: "${phrase}"`,
        });
      }
    }
  });

export type GeneratedReviewQualityInput = z.input<typeof generatedReviewQualitySchema>;

export function validateGeneratedReview(
  payload: GeneratedReviewQualityInput,
  meta: { source: 'admin' | 'cron'; slug?: string }
): { ok: true; issues: [] } | { ok: false; issues: string[] } {
  const result = generatedReviewQualitySchema.safeParse(payload);
  if (result.success) return { ok: true, issues: [] };

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
