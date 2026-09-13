import { NextRequest, NextResponse } from 'next/server';
import { createViralArticle } from '@/lib/supabase';
import { generateViralArticle } from '@/lib/generate-viral';
import { resolveProductImage } from '@/lib/image-resolver';

async function publishArticle(topic: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string }>;
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

  return { slug: article.slug, url: `https://vetor.blog/${article.slug}`, status: 'published' };
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

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
