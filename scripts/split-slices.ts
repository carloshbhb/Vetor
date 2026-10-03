import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import type { Review } from '../src/lib/types';

config({ path: '.env.local' });

// Gera tmp/rewrite-slices/slice-N.json com os reviews substanciais (>=300 chars),
// ~14 slugs por slice, para reescrita por subagentes (instância atual, sem API externa).
// Uso: npx tsx scripts/split-slices.ts [tamanho]

const SLICE_SIZE = Number(process.argv[2] || 14);

async function main() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error('Supabase service key ausente');
  const { data, error } = await supabase
    .from('reviews')
    .select('slug,product,category,verdict_label,verdict_text,pros,cons,sections')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error || !data) throw new Error(`fetch falhou: ${error?.message}`);

  const substantial = (data as Review[]).filter((r) =>
    (r.sections || []).map((s) => s.content || '').join('').length >= 300
  );
  console.log(`substanciais: ${substantial.length}/${(data as Review[]).length}`);

  const dir = path.join(__dirname, '..', 'tmp', 'rewrite-slices');
  fs.mkdirSync(dir, { recursive: true });
  // Limpa slices antigas.
  for (const f of fs.readdirSync(dir)) {
    if (/^slice-\d+\.json$/.test(f)) fs.unlinkSync(path.join(dir, f));
  }
  let n = 0;
  for (let i = 0; i < substantial.length; i += SLICE_SIZE) {
    n++;
    const slice = substantial.slice(i, i + SLICE_SIZE).map((r) => ({
      slug: r.slug,
      product: r.product,
      category: r.category,
      verdict_label: r.verdict_label,
      verdict_text: r.verdict_text,
      pros: r.pros,
      cons: r.cons,
      sections: (r.sections || []).map((s) => ({
        id: s.id,
        heading: s.heading,
        tocLabel: s.tocLabel,
        content: s.content,
      })),
    }));
    fs.writeFileSync(path.join(dir, `slice-${n}.json`), JSON.stringify(slice, null, 1));
  }
  console.log(`slices: ${n} em tmp/rewrite-slices/`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
