import { config } from 'dotenv';
import { generateReview } from '../src/lib/generate';
import { resolveProductImage } from '../src/lib/image-resolver';
import { createReview as createReviewDB } from '../src/lib/supabase';
import axios from 'axios';

config({ path: '.env.local' });

interface ArticleResult {
  slug: string;
  status: 'success' | 'failed';
  url: string;
  type: 'review';
  error?: string;
}

interface ReviewInput {
  title: string;
  category: string;
  price: string;
  image: string;
  product_url: string;
  marketplace?: string;
}

const SITE_URL = 'https://www.vetor.blog';

async function submitToIndexNow(url: string): Promise<void> {
  try {
    const apiKey = process.env.INDEXNOW_API_KEY;
    const locationId = process.env.INDEXNOW_LOCATION_ID;
    if (!apiKey || !locationId) return;

    await axios.post(
      `https://api.indexnow.org/indexnow?key=${apiKey}&urlList=${url}`,
      { urlList: [url], loc: locationId }
    );
    console.log(`  ✅ Submitted to IndexNow: ${url}`);
  } catch {
    console.log(`  ⚠️  IndexNow submission failed: ${url}`);
  }
}

async function submitToGoogle(url: string): Promise<void> {
  try {
    const apiKey = process.env.GOOGLE_INDEXING_API_KEY;
    if (!apiKey) return;

    await axios.post(
      `https://indexing.googleapis.com/v3/urlNotifications:publish`,
      { url, type: 'URL_UPDATED', urgency: 'URL_UPDATED' },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    console.log(`  ✅ Submitted to Google: ${url}`);
  } catch {
    console.log(`  ⚠️  Google submission failed: ${url}`);
  }
}

async function generateReviewArticle(product: ReviewInput): Promise<ArticleResult> {
  try {
    console.log(`\n📝 Generating review: ${product.title}...`);

    const resolvedImage = await resolveProductImage(product.image);

    const review = await generateReview({
      ...product,
      image: resolvedImage,
    });

    const result = await createReviewDB({
      slug: review.slug,
      product: review.title,
      category: review.category,
      price_new: review.price,
      image_url: review.image,
      content: review.content,
      meta_title: review.seo_title,
      meta_description: review.seo_description,
      marketplace: product.marketplace || 'mercadolivre',
      affiliate_url: product.product_url || product.image,
      hero_overall_score: review.hero_overall_score,
      verdict_score: review.verdict_score,
      hero_bars: review.hero_bars,
      specs: review.specs,
      sections: review.sections,
      pros: review.pros,
      cons: review.cons,
      compare_table: review.compare_table,
      verdict_label: review.verdict_label,
      verdict_text: review.verdict_text,
      verdict_note: review.verdict_note,
      hero_lead: review.hero_lead,
      hero_headline_line1: review.hero_headline_line1,
      hero_headline_line2: review.hero_headline_line2,
      hero_headline_em: review.hero_headline_em,
      faq: review.faq,
    });

    if (result.error) {
      console.log(`  ❌ DB insert failed for ${review.slug}: ${result.error}`);
      return {
        slug: review.slug,
        status: 'failed',
        url: `${SITE_URL}/reviews/${review.slug}`,
        type: 'review',
        error: result.error,
      };
    }

    const url = `${SITE_URL}/reviews/${review.slug}`;
    console.log(`  ✅ Review created: ${review.slug}`);

    await submitToIndexNow(url);
    await submitToGoogle(url);

    return { slug: review.slug, status: 'success', url, type: 'review' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug: product.title, status: 'failed', url: '', type: 'review', error: message };
  }
}

// Cell phone products for review generation (from P1 keyword clusters)
const CELL_PHONE_PRODUCTS: ReviewInput[] = [
  {
    title: 'Galaxy A55',
    category: 'Smartphones',
    price: 'R$1.899',
    image: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-a55.webp',
    product_url: 'https://www.mercadolivre.com.br/galaxy-a55',
  },
  {
    title: 'Moto G84',
    category: 'Smartphones',
    price: 'R$1.499',
    image: 'https://http2.mlstatic.com/D_NQ_NP_moto-g84.webp',
    product_url: 'https://www.mercadolivre.com.br/moto-g84',
  },
  {
    title: 'Redmi Note 13 Pro',
    category: 'Smartphones',
    price: 'R$1.799',
    image: 'https://http2.mlstatic.com/D_NQ_NP_redmi-note-13-pro.webp',
    product_url: 'https://www.mercadolivre.com.br/redmi-note-13-pro',
  },
  {
    title: 'POCO X6 Pro',
    category: 'Smartphones',
    price: 'R$2.199',
    image: 'https://http2.mlstatic.com/D_NQ_NP_poco-x6-pro.webp',
    product_url: 'https://www.mercadolivre.com.br/poco-x6-pro',
  },
];

async function main(): Promise<ArticleResult[]> {
  const results: ArticleResult[] = [];
  const timeoutMs = 30 * 60 * 1000;
  const startTime = Date.now();

  console.log('🚀 Iniciando geração de reviews de celulares (Smartphones)...\n');

  // Generate reviews for all 4 cell phones from the P1 comparison
  for (const product of CELL_PHONE_PRODUCTS) {
    if (Date.now() - startTime > timeoutMs) {
      console.log('⏰ Timeout de 30 minutos atingido!');
      break;
    }
    try {
      const result = await generateReviewArticle(product);
      results.push(result);
      console.log(`  📊 Progresso: ${results.length}/${CELL_PHONE_PRODUCTS.length}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Falha em ${product.title}: ${message}`);
      results.push({ slug: product.title, status: 'failed', url: '', type: 'review', error: message });
    }
  }

  console.log('\n📋 RESUMO DOS REVIEWS DE CELULARES:\n');
  console.log('═'.repeat(70));
  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : '❌';
    console.log(`${icon} [${r.type.toUpperCase()}] ${r.slug} → ${r.url}`);
    if (r.error) console.log(`     Erro: ${r.error}`);
  }
  console.log('═'.repeat(70));

  const successCount = results.filter((r) => r.status === 'success').length;
  console.log(`\n🎯 ${successCount}/${CELL_PHONE_PRODUCTS.length} reviews de celulares gerados com sucesso\n`);

  return results;
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});