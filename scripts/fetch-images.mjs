import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeBingImage(query) {
  try {
    const searchQuery = `${query} Mercado Livre`;
    const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&form=HDRSC3`;

    const res = await fetch(bingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      console.log(`  Bing erro: ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Find first ML product image
    const imageMatch = html.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"]+\.webp/);
    if (imageMatch) {
      console.log(`  Imagem encontrada: ${imageMatch[0]}`);
      return imageMatch[0];
    }

    // Try jpg
    const imageMatch2 = html.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"]+\.jpg/);
    if (imageMatch2) {
      console.log(`  Imagem encontrada: ${imageMatch2[0]}`);
      return imageMatch2[0];
    }

    console.log('  Nenhuma imagem ML encontrada no Bing');
    return null;
  } catch (err) {
    console.log(`  Bing erro: ${err.message}`);
    return null;
  }
}

async function main() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, product, slug, image_url');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  const withoutImage = data.filter(r => !r.image_url || r.image_url.trim() === '');

  console.log(`Reviews sem imagem: ${withoutImage.length}`);
  console.log('');

  for (const review of withoutImage) {
    console.log(`Produto: ${review.product}`);

    const imageUrl = await scrapeBingImage(review.product);

    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({ image_url: imageUrl })
        .eq('id', review.id);

      if (updateError) {
        console.log(`  Erro: ${updateError.message}`);
      } else {
        console.log(`  ✅ Imagem atualizada`);
      }
    }

    console.log('');
    await sleep(1500);
  }

  console.log('Concluído!');
}

main();
