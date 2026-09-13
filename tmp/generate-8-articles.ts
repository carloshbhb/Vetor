import { config } from 'dotenv';
import { generateReview } from '../src/lib/generate';
import { generateViralArticle as generateViralArticleFn } from '../src/lib/generate-viral';
import { resolveProductImage } from '../src/lib/image-resolver';
import { createReview as createReviewDB, createViralArticle as createViralArticleDB } from '../src/lib/supabase';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

interface ArticleResult {
  slug: string;
  status: 'success' | 'failed';
  url: string;
  type: 'review' | 'viral';
  error?: string;
}

interface ReviewInput {
  title: string;
  category: string;
  price: string;
  image: string;
}

interface ViralInput {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string }>;
}

const SITE_URL = 'https://vetor.blog';

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

async function commitToGitHub(slug: string, type: 'review' | 'viral'): Promise<void> {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.log(`  ⚠️  GitHub token not found, skipping commit for ${slug}`);
      return;
    }

    const repo = 'vetor-blog/vetor-blog';
    const file = type === 'review' ? 'src/data/reviews.ts' : 'src/data/articles.ts';
    const filePath = type === 'review' ? path.join(__dirname, '..', 'src', 'data', 'reviews.ts') : null;

    let content = '';
    let sha: string | undefined;

    const getUrl = `https://api.github.com/repos/${repo}/contents/${file}`;

    try {
      const getResponse = await axios.get(getUrl, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      sha = getResponse.data.sha;
      content = Buffer.from(getResponse.data.content, 'base64').toString('utf-8');
      console.log(`  📄 Read existing file SHA for ${file}`);
    } catch {
      if (filePath && fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
      }
    }

    if (!content) {
      console.log(`  ⚠️  Could not read file content for ${file}, skipping commit`);
      return;
    }

    const timestamp = new Date().toISOString();
    const commitMessage = `feat: add ${type} ${slug} [${timestamp}]`;
    const encodedContent = Buffer.from(content).toString('base64');

    const payload: Record<string, unknown> = {
      message: commitMessage,
      content: encodedContent,
    };
    if (sha) {
      payload.sha = sha;
    }

    await axios.put(getUrl, payload, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });

    console.log(`  ✅ Committed to GitHub: ${slug}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ⚠️  GitHub commit failed for ${slug}: ${message}`);
  }
}

async function generateReviewArticle(product: ReviewInput): Promise<ArticleResult> {
  try {
    console.log(`\n📝 Generating review: ${product.title}...`);

    const review = await generateReview(product);

    const result = await createReviewDB({
      slug: review.slug,
      title: review.title,
      description: review.description,
      price: review.price,
      category: review.category,
      image: review.image,
      content: review.content,
      seo_title: review.seo_title,
      seo_description: review.seo_description,
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

    await commitToGitHub(review.slug, 'review');
    await submitToIndexNow(url);
    await submitToGoogle(url);

    return { slug: review.slug, status: 'success', url, type: 'review' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug: product.title, status: 'failed', url: '', type: 'review', error: message };
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

    const url = `${SITE_URL}/${article.slug}`;
    console.log(`  ✅ Viral article created: ${article.slug}`);

    await commitToGitHub(article.slug, 'viral');
    await submitToIndexNow(url);
    await submitToGoogle(url);

    return { slug: article.slug, status: 'success', url, type: 'viral' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug: topic.title, status: 'failed', url: '', type: 'viral', error: message };
  }
}

const REVIEW_PRODUCTS: ReviewInput[] = [
  { title: 'Samsung Galaxy Fit3', category: 'Wearables', price: 'R$199', image: 'https://http2.mlstatic.com/D_NQ_NP_samsung-fit3.webp' },
  { title: 'Redmi Watch 5', category: 'Wearables', price: 'R$299', image: 'https://http2.mlstatic.com/D_NQ_NP_redmi-watch5.webp' },
  { title: 'AirPods Pro 2', category: 'Fones de Ouvido', price: 'R$1299', image: 'https://http2.mlstatic.com/D_NQ_NP_airpods-pro2.webp' },
  { title: 'MacBook Air M3', category: 'Notebooks', price: 'R$8999', image: 'https://http2.mlstatic.com/D_NQ_NP_macbook-air-m3.webp' },
];

const VIRAL_TOPICS: ViralInput[] = [
  {
    title: 'Galaxy S24 vs iPhone 15 vs Pixel 8: O Melhor Smartphone 2026?',
    category: 'Smartphones',
    comparisonProducts: [
      { name: 'Galaxy S24', slug: 'galaxy-s24', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp' },
      { name: 'iPhone 15', slug: 'iphone-15', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_iphone-15.webp' },
      { name: 'Pixel 8', slug: 'pixel-8', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_pixel-8.webp' },
    ],
  },
  {
    title: 'AirPods Pro 2 vs Galaxy Buds Pro vs Sony WF-1000XM5',
    category: 'Fones de Ouvido',
    comparisonProducts: [
      { name: 'AirPods Pro 2', slug: 'airpods-pro-2', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_airpods-pro2.webp' },
      { name: 'Galaxy Buds Pro', slug: 'galaxy-buds-pro', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-buds-pro.webp' },
      { name: 'Sony WF-1000XM5', slug: 'sony-wf-1000xm5', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_sony-wf1000xm5.webp' },
    ],
  },
  {
    title: 'MacBook Air M3 vs Dell XPS 13 vs Lenovo ThinkPad X1',
    category: 'Notebooks',
    comparisonProducts: [
      { name: 'MacBook Air M3', slug: 'macbook-air-m3', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_macbook-air-m3.webp' },
      { name: 'Dell XPS 13', slug: 'dell-xps-13', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_dell-xps-13.webp' },
      { name: 'Lenovo ThinkPad X1', slug: 'lenovo-thinkpad-x1', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_lenovo-thinkpad-x1.webp' },
    ],
  },
  {
    title: 'Apple Watch Series 9 vs Galaxy Watch 6 vs Pixel Watch 2',
    category: 'Wearables',
    comparisonProducts: [
      { name: 'Apple Watch Series 9', slug: 'apple-watch-series-9', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_apple-watch-s9.webp' },
      { name: 'Galaxy Watch 6', slug: 'galaxy-watch-6', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-watch-6.webp' },
      { name: 'Pixel Watch 2', slug: 'pixel-watch-2', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_pixel-watch-2.webp' },
    ],
  },
];

async function main(): Promise<ArticleResult[]> {
  const results: ArticleResult[] = [];
  const timeoutMs = 20 * 60 * 1000;
  const startTime = Date.now();

  console.log('🚀 Iniciando geração de 8 artigos (4 reviews + 4 virais)...\n');

  for (const product of REVIEW_PRODUCTS) {
    if (Date.now() - startTime > timeoutMs) {
      console.log('⏰ Timeout de 20 minutos atingido!');
      break;
    }
    try {
      const result = await generateReviewArticle(product);
      results.push(result);
      console.log(`  📊 Progresso: ${results.length}/8`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Falha em ${product.title}: ${message}`);
      results.push({ slug: product.title, status: 'failed', url: '', type: 'review', error: message });
    }
  }

  for (const topic of VIRAL_TOPICS) {
    if (Date.now() - startTime > timeoutMs) {
      console.log('⏰ Timeout de 20 minutos atingido!');
      break;
    }
    try {
      const result = await generateViralArticleTopic(topic);
      results.push(result);
      console.log(`  📊 Progresso: ${results.length}/8`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Falha em ${topic.title}: ${message}`);
      results.push({ slug: topic.title, status: 'failed', url: '', type: 'viral', error: message });
    }
  }

  console.log('\n📋 RESUMO DOS 8 ARTIGOS:\n');
  console.log('═'.repeat(70));
  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : '❌';
    console.log(`${icon} [${r.type.toUpperCase()}] ${r.slug} → ${r.url}`);
    if (r.error) console.log(`     Erro: ${r.error}`);
  }
  console.log('═'.repeat(70));

  const successCount = results.filter((r) => r.status === 'success').length;
  console.log(`\n🎯 ${successCount}/8 artigos gerados com sucesso\n`);

  return results;
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
