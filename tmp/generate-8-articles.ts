import { config } from 'dotenv';
import { resolveProductImage } from '../src/lib/image-resolver';
import { createViralArticle, getSupabaseServiceKeyClient, getAllViralArticles } from '../src/lib/supabase';
import { getAllProductLinks, markProductLinkReviewed, type ProductLink } from '../src/lib/product-links';
import { productLinkToPipelineInput, runReviewPipeline } from '../src/lib/content-pipeline';
import { generateViralArticle } from '../src/lib/generate-viral';
import { buildComparativeEditorialBrief } from '../src/lib/editorial-brief';
import { buildComparativeIndexNowTargets, buildContentUrl, pingNewContent } from '../src/lib/indexnow';
import { slugifyEditorialTitle } from '../src/lib/slug';

config({ path: '.env.local' });

type ArticleResult = {
  slug: string;
  status: 'success' | 'failed' | 'skipped';
  url: string;
  type: 'review' | 'comparison';
  visibility?: 'draft' | 'published';
  error?: string;
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function buildComparisonPairs(products: ProductLink[]): Array<[ProductLink, ProductLink]> {
  const groups = new Map<string, ProductLink[]>();
  for (const product of products) {
    const category = normalize(product.category || 'Tecnologia');
    const group = groups.get(category) || [];
    group.push(product);
    groups.set(category, group);
  }

  const pairs: Array<[ProductLink, ProductLink]> = [];
  for (const group of groups.values()) {
    const unique = group.filter((product, index, list) =>
      list.findIndex((other) => normalize(other.product_name) === normalize(product.product_name)) === index
    );
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        pairs.push([unique[i], unique[j]]);
      }
    }
  }

  return pairs.sort((a, b) =>
    (Number(b[0].priority || 0) + Number(b[1].priority || 0)) -
    (Number(a[0].priority || 0) + Number(a[1].priority || 0)
  );
}

async function generateReview(link: ProductLink): Promise<ArticleResult> {
  const outcome = await runReviewPipeline(productLinkToPipelineInput(link), 'cron');
  if (outcome.status !== 'created') {
    const detail = outcome.status === 'validation_failed'
      ? outcome.issues.join('; ')
      : outcome.status === 'db_error'
        ? outcome.error
        : outcome.error;
    return { slug: outcome.slug || link.slug, status: 'failed', url: '', type: 'review', error: detail };
  }

  const markResult = await markProductLinkReviewed(link.id, outcome.slug);
  if (markResult.error) {
    return {
      slug: outcome.slug,
      status: 'failed',
      url: buildContentUrl('/reviews/' + outcome.slug),
      type: 'review',
      visibility: 'draft',
      error: 'Review salvo como rascunho, mas a fila não foi atualizada: ' + markResult.error,
    };
  }

  return {
    slug: outcome.slug,
    status: 'success',
    url: buildContentUrl('/reviews/' + outcome.slug),
    type: 'review',
    visibility: 'draft',
  };
}

async function generateComparison(pair: [ProductLink, ProductLink], existingSlugs: Set<string>): Promise<ArticleResult> {
  const [first, second] = pair;
  const category = first.category?.trim() || second.category?.trim() || 'Tecnologia';
  const title = first.product_name + ' vs ' + second.product_name + ': qual vale a pena?';
  const expectedSlug = slugifyEditorialTitle(title);
  if (existingSlugs.has(expectedSlug)) {
    return { slug: expectedSlug, status: 'skipped', url: buildContentUrl('/comparativos/' + expectedSlug), type: 'comparison', visibility: 'published', error: 'Comparativo equivalente já existe.' };
  }

  const comparisonProducts = await Promise.all([first, second].map(async (product) => ({
    name: product.product_name,
    slug: product.slug,
    imageUrl: await resolveProductImage(product.image_url),
    product_url: product.product_url || product.affiliate_url,
  })));
  const topic = { title, category, comparisonProducts };
  const editorialBrief = await buildComparativeEditorialBrief(topic);
  const article = await generateViralArticle({ ...topic, editorialBrief });
  const result = await createViralArticle({
    slug: article.slug,
    title: article.title,
    description: article.description,
    category: article.category,
    content: article.content,
    hero: article.hero,
    products: article.products,
    seo_title: article.seo_title,
    seo_description: article.seo_description,
  });

  if (result.error || !result.data) {
    return { slug: article.slug, status: 'failed', url: '', type: 'comparison', error: result.error || 'Falha ao persistir o comparativo.' };
  }

  existingSlugs.add(article.slug);
  await pingNewContent(buildComparativeIndexNowTargets(article.slug), 'generate-8-articles-comparative');
  return {
    slug: article.slug,
    status: 'success',
    url: buildContentUrl('/comparativos/' + article.slug),
    type: 'comparison',
    visibility: 'published',
  };
}

async function main(): Promise<ArticleResult[]> {
  if (!process.env.NVIDIA_API_KEY?.trim()) throw new Error('[content-generation] NVIDIA_API_KEY ausente.');
  const serviceClient = getSupabaseServiceKeyClient();
  if (!serviceClient) throw new Error('[content-generation] Supabase Service Role ausente; a execução não simulará persistência.');

  const allLinks = (await getAllProductLinks({ limit: 100 }))
    .filter((link) => link.status !== 'archived' && link.product_name?.trim() && isHttpUrl(link.product_url) && isHttpUrl(link.affiliate_url) && isHttpUrl(link.image_url));
  const reviewCandidates = allLinks.filter((link) => !link.has_review).slice(0, 4);
  const comparisons = buildComparisonPairs(allLinks);
  const existingArticles = await getAllViralArticles();
  const existingSlugs = new Set(existingArticles.map((article) => article.slug));
  const results: ArticleResult[] = [];

  console.log(`[content-generation] ${allLinks.length} produtos reais elegíveis; ${reviewCandidates.length} novos reviews elegíveis; ${comparisons.length} pares comparáveis.`);

  for (const product of reviewCandidates) {
    try {
      const result = await generateReview(product);
      results.push(result);
      console.log(`[content-generation] review ${result.status}: ${result.slug}${result.error ? ' — ' + result.error : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ slug: product.slug, status: 'failed', url: '', type: 'review', error: message });
    }
  }

  let createdComparisons = 0;
  for (const pair of comparisons) {
    if (createdComparisons >= 4) break;
    try {
      const result = await generateComparison(pair, existingSlugs);
      results.push(result);
      if (result.status === 'success') createdComparisons += 1;
      console.log(`[content-generation] comparativo ${result.status}: ${result.slug}${result.error ? ' — ' + result.error : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const slug = slugifyEditorialTitle(pair[0].product_name + '-vs-' + pair[1].product_name);
      results.push({ slug, status: 'failed', url: '', type: 'comparison', error: message });
    }
  }

  const successful = results.filter((result) => result.status === 'success').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  const skipped = results.filter((result) => result.status === 'skipped').length;
  console.log(`[content-generation] Finalizado: ${successful} sucesso, ${failed} falha, ${skipped} ignorados. Reviews ficam em rascunho; comparativos persistidos ficam publicados.`);
  if (failed > 0 || results.length < 8) process.exitCode = 1;
  return results;
}

main().catch((error) => {
  console.error('[content-generation] Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
