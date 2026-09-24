import type { Review } from './types';

export interface TagEntry {
  tag: string;
  slug: string;
  count: number;
  reviews: Review[];
}

const GENERIC_TAGS = new Set([
  'review',
  'reviews',
  'analise',
  'analises',
  'vale a pena',
  'preco',
  'comprar',
  'especificacoes',
  'ficha tecnica',
  'melhor',
  'melhores',
  'guia',
  'top',
  'vs',
  '2024',
  '2025',
  '2026',
  '2027',
  'mercado livre',
  'frete gratis',
  'oferta',
  'promocao',
  'unboxing',
  'dica',
  'dicas',
  'completo',
  'completa',
  'qualidade',
  'teste',
  'testado',
  'comparativo',
  'custo beneficio',
  'custo-beneficio',
]);

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifyTag(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseKeywordParts(raw: string): string[] {
  const value = (raw || '').trim();
  if (!value) return [];
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? ''));
    } catch {
      // fall through to comma split
    }
  }
  return value.split(',');
}

function isUsableTag(display: string, normalized: string, categoryKeys: Set<string>): boolean {
  if (display.length < 3 || normalized.length < 3) return false;
  if (/^\d+$/.test(normalized)) return false;
  if (GENERIC_TAGS.has(normalized)) return false;
  if (categoryKeys.has(normalized)) return false;
  if (/(^|\s)review(\s|$)/.test(normalized)) return false;
  if (/(^|\s)reviews(\s|$)/.test(normalized)) return false;
  return true;
}

export function extractReviewTags(
  review: Review,
  categoryKeys: Set<string>
): Array<{ tag: string; slug: string }> {
  const seen = new Set<string>();
  const tags: Array<{ tag: string; slug: string }> = [];

  for (const part of parseKeywordParts(review.meta_keywords)) {
    const display = part.replace(/\s+/g, ' ').trim();
    if (!display) continue;
    const normalized = normalizeText(display);
    if (!isUsableTag(display, normalized, categoryKeys)) continue;
    const slug = slugifyTag(display);
    if (!slug || slug.length < 3 || seen.has(slug)) continue;
    seen.add(slug);
    tags.push({ tag: display, slug });
  }

  return tags;
}

export function buildTagIndex(
  reviews: Review[],
  options?: { minCount?: number }
): TagEntry[] {
  const minCount = options?.minCount ?? 2;
  const published = reviews.filter(
    (review) => !review.status || review.status === 'published'
  );

  const categoryKeys = new Set(
    published
      .map((review) => normalizeText(review.category || ''))
      .filter(Boolean)
  );

  const bySlug = new Map<string, TagEntry>();

  for (const review of published) {
    for (const { tag, slug } of extractReviewTags(review, categoryKeys)) {
      const existing = bySlug.get(slug);
      if (existing) {
        existing.count += 1;
        existing.reviews.push(review);
      } else {
        bySlug.set(slug, {
          tag,
          slug,
          count: 1,
          reviews: [review],
        });
      }
    }
  }

  return Array.from(bySlug.values())
    .filter((entry) => entry.count >= minCount)
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}
