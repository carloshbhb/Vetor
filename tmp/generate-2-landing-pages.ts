import { config } from 'dotenv';
import { getAllProductLinks, updateProductLink, type ProductLink } from '../src/lib/product-links';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { productLinkToPipelineInput, runReviewPipeline } from '../src/lib/content-pipeline';
import { slugifyEditorialTitle } from '../src/lib/slug';
import { buildContentUrl } from '../src/lib/indexnow';

config({ path: '.env.local' });

type LandingResult = {
  slug: string;
  status: 'success' | 'failed' | 'skipped';
  url: string;
  type: 'landing';
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

function visibilityFromStatus(status: unknown): 'draft' | 'published' | undefined {
  return status === 'draft' || status === 'published' ? status : undefined;
}

async function generateLandingPage(link: ProductLink): Promise<LandingResult> {
  const productName = link.product_name.trim();
  const expectedSlug = slugifyEditorialTitle(productName);
  const supabase = getSupabaseServiceKeyClient();

  if (!supabase) {
    return {
      slug: expectedSlug,
      status: 'failed',
      url: '',
      type: 'landing',
      error: 'Supabase Service Role não configurado; nenhuma LP foi simulada.',
    };
  }

  const { data: existing, error: lookupError } = await supabase
    .from('reviews')
    .select('slug,status,content_type')
    .eq('slug', expectedSlug)
    .maybeSingle();

  if (lookupError) {
    return {
      slug: expectedSlug,
      status: 'failed',
      url: '',
      type: 'landing',
      error: 'Não foi possível verificar colisão de slug; a geração foi interrompida para preservar conteúdo existente: ' + lookupError.message,
    };
  }

  if (existing) {
    if (existing.content_type === 'lp') {
      // Repair the product-to-LP relation if a previous run saved the page but failed before updating the queue.
      const linkResult = await updateProductLink(link.id, { landing_page_slug: existing.slug });
      if (linkResult.error) {
        return {
          slug: expectedSlug,
          status: 'failed',
          url: buildContentUrl('/reviews/' + expectedSlug),
          type: 'landing',
          visibility: visibilityFromStatus(existing.status),
          error: 'A LP já existe, mas não foi possível sincronizar o vínculo do produto: ' + linkResult.error,
        };
      }
    }
    return {
      slug: expectedSlug,
      status: 'skipped',
      url: buildContentUrl('/reviews/' + expectedSlug),
      type: 'landing',
      visibility: visibilityFromStatus(existing.status),
      error: existing.content_type === 'lp'
        ? 'A landing page já existe; o conteúdo foi preservado e o vínculo do produto foi sincronizado.'
        : 'Já existe um review com este slug; nenhum conteúdo foi sobrescrito.',
    };
  }

  const input = productLinkToPipelineInput(link);
  input.title = productName;
  // The queue already validates that the stored image is an absolute HTTP(S) URL.
  // Do not require HEAD/GET reachability from GitHub Actions: Mercado Livre's CDN
  // can reject automated probes while still serving the image to site visitors.
  if (!isHttpUrl(input.image)) {
    return {
      slug: expectedSlug,
      status: 'failed',
      url: '',
      type: 'landing',
      error: 'A URL da imagem do produto não é HTTP(S) válida.',
    };
  }

  // Usa NVIDIA + quality gates existentes; só muda o tipo persistido para "lp".
  // A página permanece como rascunho até revisão e publicação no admin.
  const outcome = await runReviewPipeline(input, 'cron', 'lp');

  if (outcome.status !== 'created') {
    const error = outcome.status === 'validation_failed'
      ? outcome.issues.join('; ')
      : outcome.error;

    return {
      slug: ('slug' in outcome && outcome.slug) ? outcome.slug : expectedSlug,
      status: 'failed',
      url: '',
      type: 'landing',
      visibility: 'draft',
      error,
    };
  }

  const linkResult = await updateProductLink(link.id, { landing_page_slug: outcome.slug });
  if (linkResult.error) {
    return {
      slug: outcome.slug,
      status: 'failed',
      url: buildContentUrl('/reviews/' + outcome.slug),
      type: 'landing',
      visibility: 'draft',
      error: 'A LP foi salva como rascunho, mas o vínculo do produto falhou: ' + linkResult.error,
    };
  }

  // In explicit smoke-test mode, verify the persisted row and product relation before reporting success.
  if (process.env.LANDING_TEST_PRODUCT_ID?.trim()) {
    const { data: saved, error: verifyError } = await supabase
      .from('reviews')
      .select('slug,status,content_type,specs,sections,compare_table,faq')
      .eq('slug', outcome.slug)
      .maybeSingle();

    if (verifyError || !saved) {
      return {
        slug: outcome.slug,
        status: 'failed',
        url: buildContentUrl('/reviews/' + outcome.slug),
        type: 'landing',
        visibility: 'draft',
        error: 'A LP foi gerada, mas a leitura de verificação da persistência falhou: ' + (verifyError?.message || 'registro não encontrado'),
      };
    }

    const comparison = saved.compare_table as { columns?: unknown[]; rows?: unknown[] } | null;
    const sectionsCount = Array.isArray(saved.sections) ? saved.sections.length : 0;
    const specsCount = Array.isArray(saved.specs) ? saved.specs.length : 0;
    const comparisonColumns = Array.isArray(comparison?.columns) ? comparison.columns.length : 0;
    const comparisonRows = Array.isArray(comparison?.rows) ? comparison.rows.length : 0;
    const faqCount = Array.isArray(saved.faq) ? saved.faq.length : 0;

    if (saved.content_type !== 'lp' || saved.status !== 'draft' || sectionsCount < 3 || specsCount < 3 || comparisonColumns < 3 || comparisonRows < 1 || faqCount < 1) {
      return {
        slug: outcome.slug,
        status: 'failed',
        url: buildContentUrl('/reviews/' + outcome.slug),
        type: 'landing',
        visibility: 'draft',
        error: `Contrato de persistência LP incompleto: content_type=${saved.content_type}, status=${saved.status}, sections=${sectionsCount}, specs=${specsCount}, compareColumns=${comparisonColumns}, compareRows=${comparisonRows}, faq=${faqCount}.`,
      };
    }

    const { data: relation, error: relationError } = await supabase
      .from('product_links')
      .select('landing_page_slug')
      .eq('id', link.id)
      .maybeSingle();

    if (relationError || relation?.landing_page_slug !== outcome.slug) {
      return {
        slug: outcome.slug,
        status: 'failed',
        url: buildContentUrl('/reviews/' + outcome.slug),
        type: 'landing',
        visibility: 'draft',
        error: 'A LP existe, mas o vínculo produto → landing_page_slug não passou na verificação.',
      };
    }

    console.log(`[landing-generation] Smoke test verificado: status=draft, content_type=lp, sections=${sectionsCount}, specs=${specsCount}, compareRows=${comparisonRows}, faq=${faqCount}, vínculo=OK`);
  }

  return {
    slug: outcome.slug,
    status: 'success',
    url: buildContentUrl('/reviews/' + outcome.slug),
    type: 'landing',
    visibility: 'draft',
  };
}

async function main() {
  const testProductId = process.env.LANDING_TEST_PRODUCT_ID?.trim();
  console.log(testProductId
    ? (testProductId === 'first-eligible'
        ? '[landing-generation] Smoke test: uma LP de rascunho para o primeiro produto elegível.'
        : '[landing-generation] Smoke test controlado: uma LP de rascunho para o produto explicitamente selecionado.')
    : '[landing-generation] Iniciando geração de 2 landing pages via NVIDIA + quality gate...');

  const allLinks = await getAllProductLinks({ has_review: false, limit: 500 });
  const eligibleLinks = allLinks.filter((link) =>
    link.status !== 'archived' &&
    link.product_name?.trim() &&
    isHttpUrl(link.product_url) &&
    isHttpUrl(link.affiliate_url) &&
    isHttpUrl(link.image_url) &&
    !link.has_review &&
    !link.landing_page_slug
  );

  console.log(`[landing-generation] ${allLinks.length} produtos consultados; ${eligibleLinks.length} elegíveis`);

  // Validate the image URL format, not network reachability from the CI runner.
  // Mercado Livre CDN endpoints may reject HEAD/automated probes even when browsers
  // can display the images. The full HTTP(S) URL was already validated above.
  const modeLinks = testProductId && testProductId !== 'first-eligible'
    ? eligibleLinks.filter((link) => link.id === testProductId)
    : eligibleLinks;
  const requiredCount = testProductId ? 1 : 2;
  const toProcess: ProductLink[] = modeLinks
    .filter((link) => isHttpUrl(link.image_url))
    .slice(0, requiredCount);

  if (toProcess.length < requiredCount) {
    console.error(testProductId
      ? `[landing-generation] O produto selecionado não está elegível para um teste de LP (ID não encontrado, já possui review/LP ou dados obrigatórios inválidos). Nenhum outro produto será usado.`
      : `[landing-generation] Apenas ${toProcess.length} produtos com URL de imagem HTTP(S) válida encontrados; são necessários 2.`);
    process.exitCode = 1;
    return [];
  }

  if (testProductId && testProductId !== 'first-eligible' && toProcess[0]?.id !== testProductId) {
    console.error('[landing-generation] O ID do teste não corresponde ao único produto selecionado; abortando.');
    process.exitCode = 1;
    return [];
  }

  console.log(`[landing-generation] ${toProcess.length} produtos selecionados com URLs de imagem HTTP(S) válidas`);
  const results: LandingResult[] = [];

  for (const link of toProcess) {
    try {
      const result = await generateLandingPage(link);
      results.push(result);
      console.log(`[landing-generation] ${result.status}: ${result.slug}${result.error ? ' — ' + result.error : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        slug: slugifyEditorialTitle(link.product_name || link.slug),
        status: 'failed',
        url: '',
        type: 'landing',
        visibility: 'draft',
        error: message,
      });
    }
  }

  const successful = results.filter((result) => result.status === 'success').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  const skipped = results.filter((result) => result.status === 'skipped').length;
  console.log(`[landing-generation] Finalizado: ${successful} sucesso, ${failed} falha, ${skipped} ignorados.`);

  const testDidNotCreate = Boolean(process.env.LANDING_TEST_PRODUCT_ID?.trim()) && results.some((result) => result.status !== 'success');
  if (failed > 0 || results.length < requiredCount || testDidNotCreate) {
    console.error(testDidNotCreate
      ? '[landing-generation] O smoke test exige uma LP nova criada e verificada; ignorados/falhas não contam como sucesso.'
      : `[landing-generation] Não foram concluídas as ${requiredCount} operações válidas de LP esperadas.`);
    process.exitCode = 1;
  }

  return results;
}

main().catch((error) => {
  console.error('[landing-generation] Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
