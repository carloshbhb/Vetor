import { generateReview } from './generate';
import { createReview } from './supabase';
import { validateGeneratedReview } from './content-quality';
import type { ProductLink } from './product-links';

export interface PipelineProductInput {
  title: string;
  category: string;
  price: string | number;
  image: string;
  product_url?: string;
  marketplace?: string;
}

export type PipelineOutcome =
  | { status: 'created'; slug: string; title: string }
  | { status: 'validation_failed'; slug?: string; title?: string; issues: string[] }
  | { status: 'db_error'; slug?: string; title?: string; error: string }
  | { status: 'generation_error'; error: string };

export function productLinkToPipelineInput(link: ProductLink): PipelineProductInput {
  const price =
    typeof link.price === 'number' && Number.isFinite(link.price)
      ? `R$${link.price.toFixed(2)}`
      : 'R$0';

  return {
    title: link.product_name,
    category: link.category?.trim() || 'Geral',
    price,
    image: link.image_url || '',
    product_url: link.product_url || link.affiliate_url || undefined,
    marketplace: link.marketplace || 'mercadolivre',
  };
}

export async function runReviewPipeline(
  product: PipelineProductInput,
  source: 'admin' | 'cron'
): Promise<PipelineOutcome> {
  const priceLabel =
    typeof product.price === 'number'
      ? `R$${product.price.toFixed(2)}`
      : product.price;

  let review;
  try {
    review = await generateReview({
      title: product.title,
      category: product.category,
      price: priceLabel,
      image: product.image,
      product_url: product.product_url,
      marketplace: product.marketplace || 'mercadolivre',
    });
  } catch (err: unknown) {
    return {
      status: 'generation_error',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const payload = {
    slug: review.slug,
    product: review.title,
    category: review.category,
    price_new: review.price,
    image_url: review.image,
    content: review.content,
    meta_title: review.seo_title,
    meta_description: review.seo_description,
    pros: review.pros,
    cons: review.cons,
    hero_overall_score: review.hero_overall_score,
    verdict_score: review.verdict_score,
    verdict_label: review.verdict_label,
    verdict_text: review.verdict_text,
    verdict_note: review.verdict_note,
    hero_bars: review.hero_bars,
    specs: review.specs,
    sections: review.sections,
    compare_table: review.compare_table,
    hero_lead: review.hero_lead,
    hero_headline_line1: review.hero_headline_line1,
    hero_headline_line2: review.hero_headline_line2,
    hero_headline_em: review.hero_headline_em,
    faq: review.faq,
    marketplace: product.marketplace || 'mercadolivre',
    affiliate_url: product.product_url || review.image,
  };

  const validation = validateGeneratedReview(payload, { source, slug: review.slug });
  if (!validation.ok) {
    return {
      status: 'validation_failed',
      slug: review.slug,
      title: review.title,
      issues: validation.issues,
    };
  }

  const dbResult = await createReview(payload);
  if (dbResult.error || !dbResult.data) {
    return {
      status: 'db_error',
      slug: review.slug,
      title: review.title,
      error: dbResult.error || 'Unknown database error',
    };
  }

  return { status: 'created', slug: dbResult.data.slug, title: review.title };
}
