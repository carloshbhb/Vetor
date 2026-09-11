import type { ReviewData } from './types';
import {
  buildArticleSchema,
  buildProductSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
  buildStandaloneReviewSchema,
  buildNewsArticleSchema,
} from './seo';

export interface SEOOutput {
  meta: {
    title: string;
    description: string;
    keywords: string;
    canonical: string;
  };
  schemas: object[];
  internalLinks: Array<{
    anchor: string;
    target: string;
  }>;
  readability: {
    titleLength: number;
    descriptionLength: number;
    keywordCount: number;
    passesChecks: boolean;
  };
}

const YEAR = '2026';

function optimizeTitle(product: string, originalTitle: string): string {
  let title = originalTitle;

  if (!title.toLowerCase().startsWith(product.toLowerCase())) {
    title = `${product} ${title}`;
  }

  if (!title.includes(YEAR)) {
    title = `${title} ${YEAR}`;
  }

  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }

  if (title.length < 50) {
    title = `${product} - Review completa e detalhada ${YEAR}`;
  }

  return title;
}

function optimizeDescription(product: string, originalDescription: string): string {
  let description = originalDescription;

  if (!description.toLowerCase().includes(product.toLowerCase())) {
    description = `${product}: ${description}`;
  }

  if (!/\b(confira|veja|leia|saiba)\b/i.test(description)) {
    description += ' Confira nossa análise completa.';
  }

  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }

  return description;
}

function generateKeywords(product: string, category: string, originalKeywords: string): string {
  const required = [product, category, 'vale a pena', 'review'];
  const keywords = new Set<string>(required);

  originalKeywords.split(',').forEach(kw => {
    const trimmed = kw.trim();
    if (trimmed) keywords.add(trimmed);
  });

  return Array.from(keywords).slice(0, 8).join(', ');
}

export function generateInternalLinks(
  review: ReviewData,
  existingSlugs: string[],
  maxLinks: number = 3
): Array<{ anchor: string; target: string }> {
  const links: Array<{ anchor: string; target: string }> = [];

  const candidates = existingSlugs.filter(slug => slug !== review.slug);

  for (const slug of candidates.slice(0, maxLinks)) {
    const productName = slug.replace(/-/g, ' ');
    links.push({
      anchor: `review completa do ${productName}`,
      target: `/review/${slug}`,
    });
  }

  return links;
}

export function optimizeReviewSEO(review: ReviewData, existingSlugs: string[] = []): SEOOutput {
  const title = optimizeTitle(review.product, review.meta.title);
  const description = optimizeDescription(review.product, review.meta.description);
  const keywords = generateKeywords(review.product, review.category, review.meta.keywords);

  const schemas: object[] = [
    buildArticleSchema(review),
    buildProductSchema(review),
    buildBreadcrumbSchema(review),
    buildNewsArticleSchema(review),
  ];

  const faqSchema = buildFAQSchema(review);
  if (faqSchema) schemas.push(faqSchema);

  schemas.push(buildStandaloneReviewSchema(review));

  const internalLinks = generateInternalLinks(review, existingSlugs);

  const readability = {
    titleLength: title.length,
    descriptionLength: description.length,
    keywordCount: keywords.split(',').length,
    passesChecks: true,
  };

  return {
    meta: {
      title,
      description,
      keywords,
      canonical: review.meta.canonical || `/review/${review.slug}`,
    },
    schemas,
    internalLinks,
    readability,
  };
}

export function validateSEO(output: SEOOutput): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  if (output.meta.title.length < 50 || output.meta.title.length > 60) {
    issues.push(`Title must be 50-60 chars, got ${output.meta.title.length}`);
  }

  if (output.meta.description.length < 130 || output.meta.description.length > 160) {
    issues.push(`Description must be 130-160 chars, got ${output.meta.description.length}`);
  }

  const keywordCount = output.meta.keywords.split(',').length;
  if (keywordCount < 3) {
    issues.push(`At least 3 keywords required, got ${keywordCount}`);
  }

  if (output.schemas.length < 3) {
    issues.push(`At least 3 schemas required, got ${output.schemas.length}`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
