/**
 * Normaliza a categoria editorial de drafts.
 *
 * Corrige drafts que herdaram um rótulo de origem do afiliado ("Lista Social")
 * e também drafts cuja categoria não corresponde mais à inferência editorial
 * (ex.: controle em "Smartphones", console em "Acessórios para Games").
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

  const drafts = (data || []) as Row[];
  const changes: Array<{ slug: string; from: string; to: string }> = [];
  const skipped: Array<{ slug: string; category: string; reason: string }> = [];
  let unchanged = 0;

  for (const row of drafts) {
    const slug = String(row.slug || '').trim();
    const product = String(row.product || '').trim();
    const current = String(row.category || '').trim();

    if (!slug) {
      skipped.push({ slug, category: current, reason: 'slug ausente' });
      continue;
    }

    const next = inferProductCategory(product, product, null);
    // "Geral" é o fallback: não sobrescreve uma categoria editorial já existente.
    if (next === 'Geral' && !isSourceLabelCategory(current)) {
      skipped.push({ slug, category: current, reason: 'sem categoria editorial inferível' });
      continue;
    }
    if (next === current) {
      unchanged += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from('reviews')
      .update({ category: next, updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .eq('status', 'draft');

    if (updateError) {
      skipped.push({ slug, category: current, reason: updateError.message });
      continue;
    }
    changes.push({ slug, from: current, to: next });
  }

  console.log(JSON.stringify({
    inspectedAt: new Date().toISOString(),
    draftsInspected: drafts.length,
    draftsWithSourceLabel: drafts.filter((row) => isSourceLabelCategory(row.category)).length,
    unchanged,
    changes,
    skipped,
  }, null, 2));
}

main().catch((error) => {
  console.error(`normalize-review-categories falhou: ${error.message}`);
  process.exitCode = 1;
});
