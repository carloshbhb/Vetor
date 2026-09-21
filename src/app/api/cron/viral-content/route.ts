import { NextRequest, NextResponse } from 'next/server';
import { createViralArticle } from '@/lib/supabase';
import { generateViralArticle } from '@/lib/generate-viral';
import { resolveProductImage } from '@/lib/image-resolver';
import { VIRAL_TOPICS } from '@/lib/seed-data';

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
