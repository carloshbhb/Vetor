import { config } from 'dotenv';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';

config({ path: '.env.local' });

// Diagnóstico read-only (P0-10): lista reviews publicadas com slug/título de scraping
// e/ou conteúdo fino. Não grava nada.

const MIN_CHARS = 300;

function isSpamSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  return (
    /^\d+-/.test(s) || // prefixo numérico de "20-mais-vendidor..."
    /frete/.test(s) ||
    /%/.test(s) ||
    /\d{6,}/.test(s) || // corrida longa: 4965225
    /-r\$|\$\d/.test(s) ||
    /mais-vendidor|maisvendidor/.test(s) ||
    /offfrete|grtis|gratis-gratis/.test(s)
  );
}

function isSpamProduct(product: string | null): boolean {
  if (!product) return false;
  const p = product;
  return (
    /R\$|\d+R\$|\$/.test(p) ||
    /% ?OFF|% ?off/.test(p) ||
    /\d{6,}/.test(p) ||
    /MAIS VENDIDOR|MAIS VENDIDOR\$|VENDIDOR\$/i.test(p) ||
    /frete gr.tis/i.test(p)
  );
}

async function main() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error('Supabase service key ausente');

  const { data, error } = await supabase
    .from('reviews')
    .select('slug,status,product,category,created_at,sections')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows = data || [];
  const published = rows.filter((r: any) => r.status === 'published');

  const report = published.map((r: any) => {
    const sections: any[] = Array.isArray(r.sections) ? r.sections : [];
    const contentLen = sections.reduce(
      (acc: number, s: any) => acc + (typeof s?.content === 'string' ? s.content.length : 0),
      0
    );
    const spamSlugHit = isSpamSlug(String(r.slug || ''));
    const spamProductHit = isSpamProduct(r.product);
    return {
      slug: r.slug,
      product: r.product,
      contentLen,
      thin: contentLen < MIN_CHARS,
      spamSlug: spamSlugHit,
      spamProduct: spamProductHit,
      nSections: sections.length,
      created_at: r.created_at,
    };
  });

  const spam = report.filter((r) => r.spamSlug || r.spamProduct);
  const thin = report.filter((r) => r.thin);
  const both = report.filter((r) => (r.spamSlug || r.spamProduct) && r.thin);
  const clean = report.filter((r) => !r.spamSlug && !r.spamProduct && !r.thin);

  console.log(`total reviews: ${rows.length} | publicadas: ${published.length}`);
  console.log(`\n=== SPAM (slug e/ou título de scraping): ${spam.length} ===`);
  for (const r of spam) {
    console.log(
      `  [${r.spamSlug ? 'SLUG' : ''}${r.spamSlug && r.spamProduct ? '+' : ''}${r.spamProduct ? 'TITLE' : ''}] ` +
        `${r.slug}\n      len=${r.contentLen} sections=${r.nSections} | ${String(r.product).slice(0, 90)}`
    );
  }
  console.log(`\n=== FINAS (<${MIN_CHARS}): ${thin.length} ===`);
  for (const r of thin) {
    console.log(`  ${r.slug} len=${r.contentLen} sections=${r.nSections} spam=${r.spamSlug || r.spamProduct}`);
  }
  console.log(`\n=== SPAM + FINA (candidatas a despublicar): ${both.length} ===`);
  for (const r of both) console.log(`  ${r.slug}`);
  console.log(`\n=== LIMPAS: ${clean.length} ===`);

  // Salva relatório para inspeção.
  const out = { generatedAt: new Date().toISOString(), totals: { rows: rows.length, published: published.length, spam: spam.length, thin: thin.length, both: both.length, clean: clean.length }, spam, thin, report };
  await import('fs').then((fs) => fs.writeFileSync('tmp/spam-report.json', JSON.stringify(out, null, 2)));
  console.log('\nrelatório: tmp/spam-report.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
