import {
  markProductLinkReviewed,
  type ProductLink,
} from '../src/lib/product-links';
import { productLinkToPipelineInput, runReviewPipeline } from '../src/lib/content-pipeline';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { slugifyEditorialTitle } from '../src/lib/slug';

type ExistingReview = {
  slug: string;
  product: string | null;
  status: string | null;
  content_type: string | null;
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function canonicalProductName(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(/^\s*(?:(?:review|an[aá]lise(?:\s+completa)?|avaliação|avaliacao)\s+)+/i, '');
  normalized = normalized.replace(/^\s*(?:notebook|laptop|controle|controlador)\s+/i, '');
  normalized = normalized.replace(/\s*[:–—-]\s*(?:an[aá]lise|review|vale\s+a\s+pena)\b[\s\S]*$/i, '');
  normalized = normalized.replace(/\s+(?:an[aá]lise\s+completa|review|vale\s+a\s+pena)\??\s*$/i, '');
  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const GENERIC_PRODUCT_WORDS = new Set([
  'review', 'analise', 'completa', 'completo', 'avaliacao',
  'notebook', 'laptop', 'controle', 'controlador', 'cor', 'original',
]);

const NUMBERED_PRODUCT_VARIANTS: RegExp[] = [
  /\b(?:galaxy\s+)?buds\s*(\d{1,2})\b/i,
  /\bairpods\s+pro\s*(\d{1,2})\b/i,
  /\b(?:redmi\s+)?watch\s*(\d{1,2})\b/i,
  /\bsmart\s+band\s*(\d{1,2})\b/i,
  /\b(?:echo\s+)?dot\s*(\d{1,2})\b/i,
  /\b(?:jbl\s+)?quantum\s*(\d{2,3})\b/i,
  /\bsuperlight\s*(\d{1,2})\b/i,
  /\bgamesir\s+nova\s+lite\s*(\d{1,2})\b/i,
];

function hasNumberedVariantMismatch(query: string, title: string): boolean {
  const normalizedQuery = canonicalProductName(query);
  const normalizedTitle = canonicalProductName(title);
  for (const pattern of NUMBERED_PRODUCT_VARIANTS) {
    const requested = normalizedQuery.match(pattern)?.[1] || null;
    const existing = normalizedTitle.match(pattern)?.[1] || null;
    if ((requested || existing) && requested !== existing) return true;
  }
  return false;
}

function isSameProductPage(productName: string, page: ExistingReview): boolean {
  if (!page.product?.trim() || page.content_type !== 'review') return false;
  if (hasNumberedVariantMismatch(productName, page.product)) return false;

  const productTokens = canonicalProductName(productName)
    .split(' ')
    .filter((token) => (token.length > 1 || /^\d+$/.test(token)) && !GENERIC_PRODUCT_WORDS.has(token));
  const pageTokens = new Set(
    canonicalProductName(page.product)
      .split(' ')
      .filter((token) => (token.length > 1 || /^\d+$/.test(token)) && !GENERIC_PRODUCT_WORDS.has(token))
  );

  // Compare the request's identifying tokens against the fuller editorial title.
  // Additional confirmed specs are acceptable; missing product tokens are not.
  return productTokens.length >= 2 && productTokens.every((token) => pageTokens.has(token));
}

function isEligibleProduct(link: ProductLink): boolean {
  return Boolean(
    link.id &&
    link.product_name?.trim() &&
    link.status !== 'archived' &&
    link.status !== 'reviewed' &&
    !link.has_review &&
    isHttpUrl(link.product_url) &&
    isHttpUrl(link.affiliate_url) &&
    isHttpUrl(link.image_url) &&
    ['mercadolivre', 'amazon', 'shopee'].includes(String(link.marketplace || '').toLowerCase())
  );
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const maxAttemptsRaw = Number(process.env.REVIEW_GENERATION_MAX_ATTEMPTS || 4);
  const maxAttempts = Number.isFinite(maxAttemptsRaw)
    ? Math.min(6, Math.max(1, Math.floor(maxAttemptsRaw)))
    : 4;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    throw new Error('Supabase Service Role ausente; geração interrompida sem simular uma gravação.');
  }
  if (!process.env.NVIDIA_API_KEY?.trim()) {
    throw new Error('NVIDIA_API_KEY ausente; geração de review interrompida.');
  }

  const [{ data: rawLinks, error: linksError }, { data: existingRows, error: reviewsError }] = await Promise.all([
    supabase
      .from('product_links')
      .select('*')
      .eq('has_review', false)
      .neq('status', 'reviewed')
      .neq('status', 'archived')
      .not('product_url', 'is', null)
      .neq('product_url', '')
      .not('affiliate_url', 'is', null)
      .neq('affiliate_url', '')
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('reviews')
      .select('slug,product,status,content_type')
      .limit(2000),
  ]);

  if (linksError) throw new Error('Não foi possível ler a fila de produtos: ' + linksError.message);
  if (reviewsError) throw new Error('Não foi possível conferir reviews/LPs existentes: ' + reviewsError.message);

  const existingPages = (existingRows || []) as ExistingReview[];
  const pagesBySlug = new Map(existingPages.map((page) => [page.slug, page]));

  const links = ((rawLinks || []) as ProductLink[]).filter(isEligibleProduct);
  const eligible: ProductLink[] = [];
  let reconciled = 0;
  let skippedExisting = 0;

  for (const link of links) {
    const expectedSlug = slugifyEditorialTitle(link.product_name);
    const exactSlugPage = pagesBySlug.get(expectedSlug);
    const sameProductPages = existingPages.filter((page) => isSameProductPage(link.product_name, page));
    const existingReview = sameProductPages[0] ||
      (exactSlugPage?.content_type === 'review' ? exactSlugPage : undefined);

    if (existingReview) {
      if (!dryRun) {
        const marked = await markProductLinkReviewed(link.id, existingReview.slug);
        if (marked.error) {
          throw new Error('Review já existente, mas falhou ao reconciliar produto ' + link.product_name + ': ' + marked.error);
        }
      }
      console.log('[review-generation] ' + (dryRun ? 'would reconcile' : 'reconciled') + ' existing review: ' + link.product_name + ' -> ' + existingReview.slug);
      reconciled += 1;
      continue;
    }

    // A LP and a review cannot occupy the same unique slug. Do not overwrite an LP
    // or create duplicate editorial content when the same product already has a page.
    if (exactSlugPage || sameProductPages.length > 0) {
      console.log('[review-generation] skipped existing page/slug: ' + link.product_name);
      skippedExisting += 1;
      continue;
    }

    eligible.push(link);
  }

  console.log(JSON.stringify({
    event: 'daily-review-queue-inspected',
    dryRun,
    totalRowsRead: (rawLinks || []).length,
    eligibleProducts: eligible.length,
    reconciledExistingReviews: reconciled,
    skippedExistingPages: skippedExisting,
    maxAttempts,
  }));

  if (eligible.length === 0) {
    const message = 'Nenhum produto novo elegível após deduplicação; a fila contém itens sem imagem/URL válida ou produtos que já possuem review.';
    if (dryRun) {
      console.warn('[review-generation] ' + message + ' Nenhum dado foi alterado.');
      return;
    }
    throw new Error(message);
  }

  if (dryRun) {
    console.log('[review-generation] dry-run OK; nenhum conteúdo foi gerado nem alterado.');
    console.log('[review-generation] próximos candidatos:');
    for (const link of eligible.slice(0, Math.min(maxAttempts, 5))) {
      console.log(JSON.stringify({
        id: link.id,
        product: link.product_name,
        category: link.category,
        marketplace: link.marketplace,
        hasProductUrl: isHttpUrl(link.product_url),
        hasAffiliateUrl: isHttpUrl(link.affiliate_url),
        hasImageUrl: isHttpUrl(link.image_url),
      }));
    }
    return;
  }

  const attempts = eligible.slice(0, maxAttempts);
  const failures: Array<{ product: string; error: string }> = [];

  for (const [index, link] of attempts.entries()) {
    console.log('[review-generation] attempt ' + (index + 1) + '/' + attempts.length + ': ' + link.product_name);
    try {
      const input = productLinkToPipelineInput(link);
      input.title = link.product_name;
      const outcome = await runReviewPipeline(input, 'cron', 'review');

      if (outcome.status !== 'created') {
        const error = outcome.status === 'validation_failed'
          ? outcome.issues.join('; ')
          : outcome.status === 'db_error'
            ? outcome.error
            : outcome.error;
        failures.push({ product: link.product_name, error });
        console.error('[review-generation] rejected: ' + link.product_name + ' — ' + error);
        continue;
      }

      const { data: saved, error: verifyError } = await supabase
        .from('reviews')
        .select('slug,status,content_type,product')
        .eq('slug', outcome.slug)
        .maybeSingle();

      if (verifyError || !saved) {
        failures.push({
          product: link.product_name,
          error: 'A pipeline reportou criação, mas a verificação da persistência falhou: ' + (verifyError?.message || 'registro não encontrado'),
        });
        console.error('[review-generation] persistence verification failed for ' + outcome.slug);
        continue;
      }

      if (saved.content_type !== 'review' || !['draft', 'published'].includes(saved.status)) {
        failures.push({
          product: link.product_name,
          error: 'Persistência incompatível: content_type=' + saved.content_type + ', status=' + saved.status,
        });
        console.error('[review-generation] unexpected persisted state for ' + outcome.slug);
        continue;
      }

      const marked = await markProductLinkReviewed(link.id, outcome.slug);
      if (marked.error) {
        throw new Error('Review salvo como ' + saved.status + ', mas o vínculo produto→review não foi atualizado: ' + marked.error);
      }

      const { data: relation, error: relationError } = await supabase
        .from('product_links')
        .select('has_review,review_slug')
        .eq('id', link.id)
        .maybeSingle();

      if (relationError || !relation?.has_review || relation.review_slug !== outcome.slug) {
        throw new Error('Review salvo, mas a verificação do vínculo produto→review falhou.');
      }

      console.log(JSON.stringify({
        event: 'daily-review-created',
        product: link.product_name,
        slug: outcome.slug,
        status: saved.status,
        content_type: saved.content_type,
        url: 'https://www.vetor.blog/reviews/' + outcome.slug + '/',
        productLinkUpdated: true,
      }));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ product: link.product_name, error: message });
      console.error('[review-generation] failed: ' + link.product_name + ' — ' + message);
    }
  }

  console.error('[review-generation] nenhum review foi criado após ' + attempts.length + ' tentativa(s).');
  for (const failure of failures) {
    console.error(JSON.stringify({ event: 'candidate-failure', ...failure }));
  }
  throw new Error('Geração diária falhou; nenhum review novo foi confirmado. Consulte os erros registrados acima.');
}

main().catch((error: unknown) => {
  console.error('[review-generation] fatal:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
