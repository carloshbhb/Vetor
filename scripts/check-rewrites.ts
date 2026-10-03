import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { validate } from './rewrite-review-sections';
import type { ReviewSection } from '../src/lib/types';

config({ path: '.env.local' });

// Valida arquivos tmp/rewrite-agent/<slug>.json contra o Supabase atual.
// Uso: npx tsx scripts/check-rewrites.ts [--write-summary]
// Saída: PASS/FAIL por slug. Com --write-summary, grava tmp/rewrite-check.json.

const AGENT_DIR = path.join(__dirname, '..', 'tmp', 'rewrite-agent');

async function main() {
  const writeSummary = process.argv.includes('--write-summary');
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error('Supabase service key ausente');

  const files = fs.existsSync(AGENT_DIR) ? fs.readdirSync(AGENT_DIR).filter((f) => f.endsWith('.json')) : [];
  console.log(`arquivos: ${files.length}`);

  const summary: Record<string, { ok: boolean; errors: string[] }> = {};
  let pass = 0;
  let fail = 0;
  for (const file of files) {
    const slug = file.replace(/\.json$/, '');
    try {
      const payload = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, file), 'utf8'));
      const rewritten = (Array.isArray(payload) ? payload : payload.sections) as Array<{
        id?: string;
        content?: string;
      }>;
      const { data, error } = await supabase.from('reviews').select('sections').eq('slug', slug).single();
      if (error || !data) {
        summary[slug] = { ok: false, errors: [`review não encontrado no banco: ${error?.message}`] };
        fail++;
        continue;
      }
      const v = validate((data.sections || []) as ReviewSection[], rewritten);
      summary[slug] = v;
      if (v.ok) pass++;
      else fail++;
      console.log(`${v.ok ? 'PASS' : 'FAIL'} ${slug}${v.ok ? '' : `: ${v.errors.join(' | ').slice(0, 220)}`}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary[slug] = { ok: false, errors: [message.slice(0, 200)] };
      fail++;
      console.log(`FAIL ${slug}: ${message.slice(0, 160)}`);
    }
  }
  console.log(`\nPASS: ${pass} | FAIL: ${fail}`);
  if (writeSummary) {
    fs.writeFileSync(path.join(__dirname, '..', 'tmp', 'rewrite-check.json'), JSON.stringify(summary, null, 2));
  }
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
