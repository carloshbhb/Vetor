import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const c = createClient(url, key);

  const { data, error } = await c.from('reviews').select('category,status');
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  const m = new Map<string, Record<string, number>>();
  for (const r of data ?? []) {
    const k = r.category ?? '(null)';
    const v = m.get(k) ?? {};
    v[r.status] = (v[r.status] ?? 0) + 1;
    m.set(k, v);
  }
  for (const [k, v] of [...m.entries()].sort()) {
    console.log(k.padEnd(26), JSON.stringify(v));
  }
}

main();
