import { revalidatePath } from 'next/cache';

/**
 * Invalidates every App Router surface that can change after a review write.
 * Exact paths refresh the changed item immediately; dynamic route patterns
 * invalidate other category/intent/tag variants on their next request.
 */
export function revalidateReviewSurfaces(
  slugs: string[] = [],
  categories: string[] = []
): void {
  const safeSlugs = Array.from(
    new Set(
      slugs
        .map((slug) => slug.trim().replace(/^\/+|\/+$/g, ''))
        .filter((slug) => slug && !slug.includes('/') && !slug.includes('..'))
    )
  );
  const safeCategories = Array.from(
    new Set(categories.map((category) => category.trim()).filter(Boolean))
  );

  for (const slug of safeSlugs) {
    revalidatePath('/reviews/' + slug);
  }

  for (const category of safeCategories) {
    revalidatePath('/reviews/categoria/' + encodeURIComponent(category));
  }

  // Public indexes and landing pages whose cards, counts, and internal links
  // depend on the review inventory.
  for (const path of [
    '/',
    '/reviews',
    '/reviews/categoria',
    '/melhores',
    '/tags',
    '/sitemap.xml',
  ]) {
    revalidatePath(path);
  }

  // Dynamic variants must be invalidated by route pattern, not just the
  // shared directory URL. Next regenerates each visited variant on demand.
  for (const routePattern of [
    '/reviews/[slug]',
    '/reviews/categoria/[category]',
    '/melhores/[categoria]',
    '/melhores/[categoria]/[intencao]',
    '/tags/[tag]',
  ]) {
    revalidatePath(routePattern, 'page');
  }
}

/** Invalidates the comparison index and its dynamic article route. */
export function revalidateComparativeSurfaces(slugs: string[] = []): void {
  const safeSlugs = Array.from(
    new Set(
      slugs
        .map((slug) => slug.trim().replace(/^\/+|\/+$/g, ''))
        .filter((slug) => slug && !slug.includes('/') && !slug.includes('..'))
    )
  );

  for (const slug of safeSlugs) {
    revalidatePath('/comparativos/' + slug);
  }

  revalidatePath('/');
  revalidatePath('/comparativos');
  revalidatePath('/sitemap.xml');
  revalidatePath('/comparativos/[slug]', 'page');
}
