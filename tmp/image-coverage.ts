import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function main() {
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await c
    .from('reviews')
    .select('slug,product,image_url,verdict_score,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const rows = data ?? [];
  const withImg = rows.filter((r) => !!r.image_url);
  console.log(`publicadas: ${rows.length} | com image_url: ${withImg.length}`);
  console.log('--- latest 10 ---');
  for (const r of rows.slice(0, 10)) {
    console.log(
      `${r.image_url ? 'IMG ' : '----'} ${String(r.verdict_score).padStart(4)} ${r.slug}`
    );
  }
  console.log('--- top por verdict_score >= 9 ---');
  for (const r of rows.filter((r) => (r.verdict_score ?? 0) >= 9).slice(0, 6)) {
    console.log(
      `${r.image_url ? 'IMG ' : '----'} ${String(r.verdict_score).padStart(4)} ${r.slug}`
    );
  }
}

main();
