import { config } from 'dotenv';
import { getAllProductLinks, type ProductLink } from '../src/lib/product-links';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { productLinkToPipelineInput, runReviewPipeline } from '../src/lib/content-pipeline';
import { resolveProductImage } from '../src/lib/image-resolver';
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
    return {
      slug: expectedSlug,
      status: 'skipped',
      url: buildContentUrl('/reviews/' + expectedSlug),
      type: 'landing',
      visibility: visibilityFromStatus(existing.status),
      error: existing.content_type === 'lp'
        ? 'A landing page já existe; o conteúdo atual foi preservado.'
        : 'Já existe um review com este slug; nenhum conteúdo foi sobrescrito.',
    };
  }

  const input = productLinkToPipelineInput(link);
  input.title = productName;
  input.image = await resolveProductImage(input.image);

  if (!isHttpUrl(input.image)) {
    return {
      slug: expectedSlug,
      status: 'failed',
      url: '',
      type: 'landing',
      error: 'A imagem do produto não foi resolvida para uma URL HTTP(S) válida.',
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

  return {
    slug: outcome.slug,
    status: 'success',
    url: buildContentUrl('/reviews/' + outcome.slug),
    type: 'landing',
    visibility: 'draft',
  };
}

async function main() {
  console.log('[landing-generation] Iniciando geração de 2 landing pages via NVIDIA + quality gate...');

  const allLinks = await getAllProductLinks({ limit: 100 });
  const eligibleLinks = allLinks.filter((link) =>
    link.status !== 'archived' &&
    link.product_name?.trim() &&
    isHttpUrl(link.product_url) &&
    isHttpUrl(link.affiliate_url) &&
    isHttpUrl(link.image_url) &&
    !link.has_review
  );

  console.log(`[landing-generation] ${allLinks.length} produtos consultados; ${eligibleLinks.length} elegíveis`);

  const toProcess = eligibleLinks.slice(0, 2);
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

  if (failed > 0 || results.length < 2) {
    console.error('[landing-generation] Não foram concluídas duas operações válidas de LP.');
    process.exitCode = 1;
  }

  return results;
}

main().catch((error) => {
  console.error('[landing-generation] Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
