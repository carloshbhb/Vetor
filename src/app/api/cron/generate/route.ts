import { NextRequest, NextResponse } from 'next/server';
import { createReview, createViralArticle } from '@/lib/supabase';
import { generateReview } from '@/lib/generate';
import { generateViralArticle } from '@/lib/generate-viral';
import { resolveProductImage } from '@/lib/image-resolver';

interface CronResult {
  review?: { slug: string; status: string; error?: string };
  viralArticle?: { slug: string; status: string; error?: string };
  timestamp: string;
}

const REVIEW_PRODUCTS = [
  { title: 'Samsung Galaxy Fit3', category: 'Wearables', price: 'R$199', image: 'https://http2.mlstatic.com/D_NQ_NP_samsung-fit3.webp', product_url: 'https://www.mercadolivre.com.br/samsung-galaxy-fit3' },
  { title: 'Redmi Watch 5', category: 'Wearables', price: 'R$299', image: 'https://http2.mlstatic.com/D_NQ_NP_redmi-watch5.webp', product_url: 'https://www.mercadolivre.com.br/redmi-watch-5' },
  { title: 'AirPods Pro 2', category: 'Fones de Ouvido', price: 'R$1299', image: 'https://http2.mlstatic.com/D_NQ_NP_airpods-pro2.webp', product_url: 'https://www.mercadolivre.com.br/airpods-pro-2' },
  { title: 'MacBook Air M3', category: 'Notebooks', price: 'R$8999', image: 'https://http2.mlstatic.com/D_NQ_NP_macbook-air-m3.webp', product_url: 'https://www.mercadolivre.com.br/macbook-air-m3' },
  { title: 'Apple Watch Series 9', category: 'Wearables', price: 'R$3299', image: 'https://http2.mlstatic.com/D_NQ_NP_apple-watch-s9.webp', product_url: 'https://www.mercadolivre.com.br/apple-watch-series-9' },
  { title: 'Sony WF-1000XM5', category: 'Fones de Ouvido', price: 'R$1599', image: 'https://http2.mlstatic.com/D_NQ_NP_sony-wf1000xm5.webp', product_url: 'https://www.mercadolivre.com.br/sony-wf-1000xm5' },
];

const VIRAL_TOPICS = [
  {
    title: 'Galaxy S24 vs iPhone 15 vs Pixel 8: O Melhor Smartphone 2026?',
    category: 'Smartphones',
    comparisonProducts: [
      { name: 'Galaxy S24', slug: 'galaxy-s24', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp', product_url: 'https://www.mercadolivre.com.br/galaxy-s24' },
      { name: 'iPhone 15', slug: 'iphone-15', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_iphone-15.webp', product_url: 'https://www.mercadolivre.com.br/iphone-15' },
      { name: 'Pixel 8', slug: 'pixel-8', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_pixel-8.webp', product_url: 'https://www.mercadolivre.com.br/pixel-8' },
    ],
  },
  {
    title: 'AirPods Pro 2 vs Galaxy Buds Pro vs Sony WF-1000XM5',
    category: 'Fones de Ouvido',
    comparisonProducts: [
      { name: 'AirPods Pro 2', slug: 'airpods-pro-2', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_airpods-pro2.webp', product_url: 'https://www.mercadolivre.com.br/airpods-pro-2' },
      { name: 'Galaxy Buds Pro', slug: 'galaxy-buds-pro', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-buds-pro.webp', product_url: 'https://www.mercadolivre.com.br/galaxy-buds-pro' },
      { name: 'Sony WF-1000XM5', slug: 'sony-wf-1000xm5', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_sony-wf1000xm5.webp', product_url: 'https://www.mercadolivre.com.br/sony-wf-1000xm5' },
    ],
  },
  {
    title: 'MacBook Air M3 vs Dell XPS 13 vs Lenovo ThinkPad X1',
    category: 'Notebooks',
    comparisonProducts: [
      { name: 'MacBook Air M3', slug: 'macbook-air-m3', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_macbook-air-m3.webp', product_url: 'https://www.mercadolivre.com.br/macbook-air-m3' },
      { name: 'Dell XPS 13', slug: 'dell-xps-13', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_dell-xps-13.webp', product_url: 'https://www.mercadolivre.com.br/dell-xps-13' },
      { name: 'Lenovo ThinkPad X1', slug: 'lenovo-thinkpad-x1', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_lenovo-thinkpad-x1.webp', product_url: 'https://www.mercadolivre.com.br/lenovo-thinkpad-x1' },
    ],
  },
  {
    title: 'Apple Watch Series 9 vs Galaxy Watch 6 vs Pixel Watch 2',
    category: 'Wearables',
    comparisonProducts: [
      { name: 'Apple Watch Series 9', slug: 'apple-watch-series-9', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_apple-watch-s9.webp', product_url: 'https://www.mercadolivre.com.br/apple-watch-series-9' },
      { name: 'Galaxy Watch 6', slug: 'galaxy-watch-6', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-watch-6.webp', product_url: 'https://www.mercadolivre.com.br/galaxy-watch-6' },
      { name: 'Pixel Watch 2', slug: 'pixel-watch-2', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_pixel-watch-2.webp', product_url: 'https://www.mercadolivre.com.br/pixel-watch-2' },
    ],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result: CronResult = { timestamp: new Date().toISOString() };

    const product = pickRandom(REVIEW_PRODUCTS);
    console.log(`[CRON] Generating review: ${product.title}`);

    try {
      const review = await generateReview({
        ...product,
        product_url: product.product_url,
        marketplace: 'mercadolivre',
      });
      const dbResult = await createReview({
        slug: review.slug,
        product: review.title,
        category: review.category,
        price_new: review.price,
        image_url: review.image,
        content: review.content,
        meta_title: review.seo_title,
        meta_description: review.seo_description,
        pros: review.pros,
        cons: review.cons,
        hero_overall_score: review.hero_overall_score,
        verdict_score: review.verdict_score,
        verdict_label: review.verdict_label,
        verdict_text: review.verdict_text,
        verdict_note: review.verdict_note,
        hero_bars: review.hero_bars,
        specs: review.specs,
        sections: review.sections,
        compare_table: review.compare_table,
        hero_lead: review.hero_lead,
        hero_headline_line1: review.hero_headline_line1,
        hero_headline_line2: review.hero_headline_line2,
        hero_headline_em: review.hero_headline_em,
        faq: review.faq,
        marketplace: 'mercadolivre',
        affiliate_url: product.product_url || review.image,
      });

      if (dbResult.error) {
        result.review = { slug: review.slug, status: 'failed', error: dbResult.error };
      } else {
        result.review = { slug: review.slug, status: 'success' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.review = { slug: product.title, status: 'failed', error: message };
    }

    const topic = pickRandom(VIRAL_TOPICS);
    console.log(`[CRON] Generating viral article: ${topic.title}`);

    try {
      const resolvedProducts = await Promise.all(
        topic.comparisonProducts.map(async (p) => ({
          ...p,
          imageUrl: await resolveProductImage(p.imageUrl),
        }))
      );

      const article = await generateViralArticle({
        title: topic.title,
        category: topic.category,
        comparisonProducts: resolvedProducts,
      });

      const dbResult = await createViralArticle({
        slug: article.slug,
        title: article.title,
        description: article.description,
        category: article.category,
        content: article.content,
        hero: article.hero,
        products: resolvedProducts,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
      });

      if (dbResult.error) {
        result.viralArticle = { slug: article.slug, status: 'failed', error: dbResult.error };
      } else {
        result.viralArticle = { slug: article.slug, status: 'success' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.viralArticle = { slug: topic.title, status: 'failed', error: message };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}
