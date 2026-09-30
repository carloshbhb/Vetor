import { config } from 'dotenv';
import { generateViralArticle as generateViralArticleFn } from '../src/lib/generate-viral';
import { resolveProductImage } from '../src/lib/image-resolver';
import { createViralArticle as createViralArticleDB } from '../src/lib/supabase';
import axios from 'axios';

config({ path: '.env.local' });

interface ArticleResult {
  slug: string;
  status: 'success' | 'failed';
  url: string;
  type: 'viral';
  error?: string;
}

interface ViralInput {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
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

async function generateViralArticleTopic(topic: ViralInput): Promise<ArticleResult> {
  try {
    console.log(`\n🔥 Generating viral: ${topic.title}...`);

    const resolvedProducts = await Promise.all(
      topic.comparisonProducts.map(async (p) => ({
        ...p,
        imageUrl: await resolveProductImage(p.imageUrl),
      }))
    );

    const article = await generateViralArticleFn({
      title: topic.title,
      category: topic.category,
      comparisonProducts: resolvedProducts,
    });

    const hero = {
      imageUrl: article.hero.imageUrl,
      bars: article.hero.bars.map((bar) => ({
        ...bar,
        imageUrl: bar.imageUrl,
      })),
    };

    const result = await createViralArticleDB({
      slug: article.slug,
      title: article.title,
      description: article.description,
      category: article.category,
      content: article.content,
      hero,
      products: resolvedProducts,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
    });

    if (result.error) {
      console.log(`  ❌ DB insert failed for ${article.slug}: ${result.error}`);
      return {
        slug: article.slug,
        status: 'failed',
        url: `${SITE_URL}/${article.slug}`,
        type: 'viral',
        error: result.error,
      };
    }

    const url = `${SITE_URL}/comparativos/${article.slug}`;
    console.log(`  ✅ Viral article created: ${article.slug}`);

    await submitToIndexNow(url);
    await submitToGoogle(url);

    return { slug: article.slug, status: 'success', url, type: 'viral' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug: topic.title, status: 'failed', url: '', type: 'viral', error: message };
  }
}

const VIRAL_TOPICS: ViralInput[] = [
  {
    title: 'Melhor Fone Bluetooth 2026: AirPods Pro 2 vs Galaxy Buds2 Pro vs QC Ultra vs JBL Tour Pro 2',
    category: 'Fones de Ouvido',
    comparisonProducts: [
      { name: 'AirPods Pro 2', slug: 'airpods-pro-2', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_airpods-pro2.webp', product_url: 'https://www.mercadolivre.com.br/airpods-pro-2' },
      { name: 'Galaxy Buds2 Pro', slug: 'galaxy-buds2-pro', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-buds2-pro.webp', product_url: 'https://www.mercadolivre.com.br/galaxy-buds2-pro' },
      { name: 'QC Ultra', slug: 'qc-ultra', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_qc-ultra.webp', product_url: 'https://www.mercadolivre.com.br/qc-ultra' },
      { name: 'JBL Tour Pro 2', slug: 'jbl-tour-pro-2', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_jbl-tour-pro-2.webp', product_url: 'https://www.mercadolivre.com.br/jbl-tour-pro-2' },
    ],
  },
  {
    title: 'Melhor Smartwatch Custo-Benefício 2026: Galaxy Watch 6 vs Redmi Watch 5 vs Amazfit GTR 4 vs Watch Ultra',
    category: 'Wearables',
    comparisonProducts: [
      { name: 'Galaxy Watch 6', slug: 'galaxy-watch-6', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-watch-6.webp', product_url: 'https://www.mercadolivre.com.br/galaxy-watch-6' },
      { name: 'Redmi Watch 5', slug: 'redmi-watch-5', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_redmi-watch5.webp', product_url: 'https://www.mercadolivre.com.br/redmi-watch-5' },
      { name: 'Amazfit GTR 4', slug: 'amazfit-gtr-4', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_amazfit-gtr-4.webp', product_url: 'https://www.mercadolivre.com.br/amazfit-gtr-4' },
      { name: 'Watch Ultra', slug: 'watch-ultra', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_watch-ultra.webp', product_url: 'https://www.mercadolivre.com.br/watch-ultra' },
    ],
  },
  {
    title: 'Melhor Celular Custo-Benefício 2026: Galaxy A55 vs Moto G84 vs Redmi Note 13 Pro vs POCO X6 Pro',
    category: 'Smartphones',
    comparisonProducts: [
      { name: 'Galaxy A55', slug: 'galaxy-a55', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-a55.webp', product_url: 'https://www.mercadolivre.com.br/galaxy-a55' },
      { name: 'Moto G84', slug: 'moto-g84', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_moto-g84.webp', product_url: 'https://www.mercadolivre.com.br/moto-g84' },
      { name: 'Redmi Note 13 Pro', slug: 'redmi-note-13-pro', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_redmi-note-13-pro.webp', product_url: 'https://www.mercadolivre.com.br/redmi-note-13-pro' },
      { name: 'POCO X6 Pro', slug: 'poco-x6-pro', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_poco-x6-pro.webp', product_url: 'https://www.mercadolivre.com.br/poco-x6-pro' },
    ],
  },
];

async function main(): Promise<ArticleResult[]> {
  const results: ArticleResult[] = [];
  const timeoutMs = 20 * 60 * 1000;
  const startTime = Date.now();

  console.log('🚀 Iniciando geração de 3 artigos virais P1...\n');

  for (const topic of VIRAL_TOPICS) {
    if (Date.now() - startTime > timeoutMs) {
      console.log('⏰ Timeout de 20 minutos atingido!');
      break;
    }
    try {
      const result = await generateViralArticleTopic(topic);
      results.push(result);
      console.log(`  📊 Progresso: ${results.length}/3`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Falha em ${topic.title}: ${message}`);
      results.push({ slug: topic.title, status: 'failed', url: '', type: 'viral', error: message });
    }
  }

  console.log('\n📋 RESUMO DOS 3 ARTIGOS VIRAIS P1:\n');
  console.log('═'.repeat(70));
  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : '❌';
    console.log(`${icon} [${r.type.toUpperCase()}] ${r.slug} → ${r.url}`);
    if (r.error) console.log(`     Erro: ${r.error}`);
  }
  console.log('═'.repeat(70));

  const successCount = results.filter((r) => r.status === 'success').length;
  console.log(`\n🎯 ${successCount}/3 artigos virais P1 gerados com sucesso\n`);

  return results;
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});