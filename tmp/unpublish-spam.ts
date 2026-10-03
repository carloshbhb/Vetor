import { config } from 'dotenv';
import * as fs from 'fs';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';

config({ path: '.env.local' });

// P0-10: despublica (status -> draft) as 2 reviews-spam + 3 finas legítimas.
// Uso:
//   npx tsx tmp/unpublish-spam.ts            (dry-run: só lista)
//   npx tsx tmp/unpublish-spam.ts --apply    (backup + update + verificação)
// Backup completo (select *) gravado em tmp/backup-p0-10-<data>.json ANTES do update.

const SPAM = [
  '20-mais-vendidor-669r-4965225-offfrete-grtis-micro-ondas-mondial-21l-1200w-mo-01-21-e-espelhado',
  '8-mais-vendidor-299r-15647-offfrete-grtis-parafusadeira-e-furadeira-impacto-the-black-tools-tb-',
];
const THIN = ['airpods-pro-2', 'redmi-watch-5', 'sony-wf-1000xm5'];
const SLUGS = [...SPAM, ...THIN];

async function main() {
  const apply = process.argv.includes('--apply');
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error('Supabase service key ausente');

  const { data: rows, error } = await supabase.from('reviews').select('*').in('slug', SLUGS);
  if (error) throw new Error(error.message);
  if (!rows || rows.length !== SLUGS.length) {
    throw new Error(`esperava ${SLUGS.length} linhas, veio ${rows?.length ?? 0}`);
  }

  console.log(`alvo: ${SLUGS.length} reviews (${SPAM.length} spam + ${THIN.length} finas)`);
  for (const r of rows) {
    console.log(`  ${r.status === 'published' ? 'published' : 'ATENCAO=' + r.status} → draft | ${r.slug}`);
  }

  if (!apply) {
    console.log('\nDRY-RUN (nada gravado). Rode com --apply.');
    return;
  }

  const backupPath = `tmp/backup-p0-10-${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2));
  console.log(`\nbackup: ${backupPath}`);

  const { error: uerr } = await supabase
    .from('reviews')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .in('slug', SLUGS)
    .eq('status', 'published');
  if (uerr) throw new Error(`update falhou: ${uerr.message}`);

  const { data: after, error: aerr } = await supabase
    .from('reviews')
    .select('slug,status')
    .in('slug', SLUGS);
  if (aerr) throw new Error(aerr.message);
  const bad = (after || []).filter((r: any) => r.status !== 'draft');
  console.log('verificação:');
  for (const r of after || []) console.log(`  ${r.status} | ${r.slug}`);
  if (bad.length > 0) throw new Error(`${bad.length} linhas NÃO viraram draft`);
  console.log('OK: todas em draft');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
