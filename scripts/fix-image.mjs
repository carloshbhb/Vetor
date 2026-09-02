import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Known working product images
const productImages = {
  'samsung-galaxy-buds-fe-analise': 'https://images.samsung.com/is/image/samsung/p6pim/br/sm-r400nzaalro/gallery/br-galaxy-buds-fe-r400-sm-r400nzaalro-537174741?$400_400_PNG$',
};

async function main() {
  for (const [slug, imageUrl] of Object.entries(productImages)) {
    console.log('Atualizando: ' + slug);
    console.log('Imagem: ' + imageUrl);

    const { error } = await supabase
      .from('reviews')
      .update({ image_url: imageUrl })
      .eq('slug', slug);

    if (error) {
      console.log('Erro: ' + error.message);
    } else {
      console.log('✅ OK');
    }
  }
}

main();
