import { NextRequest, NextResponse } from 'next/server';
import { createViralArticle } from '@/lib/supabase';
import { generateViralArticle } from '@/lib/generate-viral';
import { resolveProductImage } from '@/lib/image-resolver';

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

async function publishArticle(topic: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}): Promise<{ slug: string; url: string; status: string }> {
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

  const hero = {
    imageUrl: article.hero.imageUrl,
    bars: article.hero.bars.map((bar) => ({
      ...bar,
      imageUrl: bar.imageUrl,
    })),
  };

  const result = await createViralArticle({
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
    throw new Error(String(result.error));
  }

  return { slug: article.slug, url: `https://vetor.blog/comparativos/${article.slug}`, status: 'published' };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const topic = pickRandom(VIRAL_TOPICS);
    console.log(`[CRON-VIRAL] Gerando artigo viral: ${topic.title}`);

    const result = await publishArticle(topic);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      topic: topic.title,
      ...result,
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CRON-VIRAL] Erro:', message);
    return NextResponse.json({ error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { topic, products } = await request.json();

    if (!topic || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Missing topic or products' }, { status: 400 });
    }

    const result = await publishArticle({
      title: topic.title,
      category: topic.category,
      comparisonProducts: products,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
