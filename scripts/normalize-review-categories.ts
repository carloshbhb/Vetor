/**
 * Normaliza a categoria editorial de drafts cujo campo `category` recebeu um
 * rótulo de origem do afiliado ("Lista Social"), que não é uma categoria
 * editorial e criaria hubs finos sem intenção de busca.
 *
 * Só toca drafts. Conteúdo publicado nunca é alterado por este script.
 */
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { inferProductCategory, isSourceLabelCategory } from '../src/lib/product-category';

type Row = Record<string, unknown>;

async function main() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('slug,status,content_type,product,category')
    .eq('status', 'draft');

  if (error) throw new Error(`reviews: ${error.message}`);

  const candidates = ((data || []) as Row[]).filter((row) => isSourceLabelCategory(row.category));
  const changes: Array<{ slug: string; from: string; to: string }> = [];
  const skipped: Array<{ slug: string; category: string; reason: string }> = [];

  for (const row of candidates) {
    const slug = String(row.slug || '').trim();
    const product = String(row.product || '').trim();
    const next = inferProductCategory(product, product, null);
    if (!slug || next === 'Geral') {
      skipped.push({ slug, category: String(row.category || ''), reason: 'sem categoria editorial inferível' });
      continue;
    }
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ category: next, updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .eq('status', 'draft');

    if (updateError) {
      skipped.push({ slug, category: String(row.category || ''), reason: updateError.message });
      continue;
    }
    changes.push({ slug, from: String(row.category || ''), to: next });
  }

  console.log(JSON.stringify({
    inspectedAt: new Date().toISOString(),
    draftsWithSourceLabel: candidates.length,
    changes,
    skipped,
  }, null, 2));
}

main().catch((error) => {
  console.error(`normalize-review-categories falhou: ${error.message}`);
  process.exitCode = 1;
});
