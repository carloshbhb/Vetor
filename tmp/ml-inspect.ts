import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await sb
    .from('product_links')
    .select('slug,product_name,price,image_url,product_url,affiliate_url,status')
    .eq('status', 'active')
    .order('slug')
    .limit(10);

  if (error) {
    console.log('ERRO', error.message);
    process.exit(1);
  }

  for (const r of data as any[]) {
    console.log(
      `${r.slug} | price=${r.price} | img=${r.image_url ? 'y' : 'N'} | ${(r.product_url || '').slice(0, 70)}`
    );
  }

  const { count } = await sb.from('product_links').select('*', { count: 'exact', head: true });
  const { count: comPreco } = await sb
    .from('product_links')
    .select('*', { count: 'exact', head: true })
    .not('price', 'is', null);
  const { count: comImg } = await sb
    .from('product_links')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null);

  console.log(`\ntotal=${count} comPreco=${comPreco} comImg=${comImg}`);
}

main();
