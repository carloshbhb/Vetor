import { NextRequest, NextResponse } from 'next/server';
import { createReview } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\breview\b/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-+/g, '-');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { articleData, category } = body;

    if (!articleData) {
      return NextResponse.json(
        { error: 'Dados do artigo são obrigatórios.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const reviewId = crypto.randomUUID();
    const d = articleData;

    const slug = slugify(d.meta?.title || 'artigo-comparativo');
    const productNames = d.products?.map((p: any) => p.name).join(' vs ') || 'Comparativo';

    const fullReview = {
      id: reviewId,
      slug,
      status: 'published' as const,
      meta: {
        title: d.meta?.title || 'Artigo Comparativo',
        description: d.meta?.description || '',
        keywords: d.meta?.keywords || '',
        readingTime: d.meta?.reading_time || 10,
        canonical: d.meta?.canonical || null,
        ogImage: d.meta?.og_image || null,
      },
      product: productNames,
      category: category || d.hero?.headline_line1 || 'Comparativos',
      marketplace: 'Multi',
      priceOld: d.products?.[0]?.old_price || '',
      priceNew: d.products?.[0]?.price || '',
      affiliateUrl: d.products?.[0]?.affiliate_url || '',
      imageUrl: d.products?.[0]?.image_url || '',
      adsEnabled: true,
      hero: {
        headlineLine1: d.hero?.headline_line1 || 'COMPARATIVO',
        headlineLine2: d.hero?.headline_line2 || 'QUAL O MELHOR?',
        headlineEm: d.hero?.headline_em || productNames,
        lead: d.hero?.lead || '',
        overallScore: d.hero?.overall_score || 8.5,
        bars: d.hero?.bars || [],
      },
      specs: d.specs || [],
      sections: d.sections?.map((s: any) => ({
        id: s.id || slugify(s.heading),
        heading: s.heading,
        tocLabel: s.toc_label || s.heading,
        tocEmoji: s.toc_emoji || '📌',
        content: s.content,
      })) || [],
      compareTable: d.compareTable || { caption: '', columns: [], winnerCol: 1, rows: [] },
      pros: d.products?.flatMap((p: any) => p.pros || []) || [],
      cons: d.products?.flatMap((p: any) => p.cons || []) || [],
      testimonials: [],
      faq: d.faq || [],
      verdict: d.verdict || {
        score: 8.5,
        label: 'MELHOR ESCOLHA',
        text: 'Artigo comparativo com as melhores opções.',
        note: 'Confira nossa análise completa.',
      },
      schemaRating: {
        ratingValue: d.verdict?.score || 8.5,
        reviewCount: 1000,
      },
      googleRank: 0,
      lastRankCheck: now,
      createdAt: now,
      updatedAt: now,
    };

    // Save to database
    await createReview({
      slug: fullReview.slug,
      status: fullReview.status,
      product: fullReview.product,
      category: fullReview.category,
      marketplace: fullReview.marketplace,
      priceOld: fullReview.priceOld,
      priceNew: fullReview.priceNew,
      affiliateUrl: fullReview.affiliateUrl,
      imageUrl: fullReview.imageUrl,
      adsEnabled: fullReview.adsEnabled,
      meta: fullReview.meta,
      hero: fullReview.hero,
      specs: fullReview.specs,
      sections: fullReview.sections,
      compareTable: fullReview.compareTable,
      pros: fullReview.pros,
      cons: fullReview.cons,
      faq: fullReview.faq,
      testimonials: fullReview.testimonials,
      verdict: fullReview.verdict,
      schemaRating: fullReview.schemaRating,
      googleRank: fullReview.googleRank,
      lastRankCheck: fullReview.lastRankCheck,
    });

    // Commit to GitHub
    const gitResult = await commitNewReviewToGitHub(fullReview);

    return NextResponse.json({
      success: true,
      slug: fullReview.slug,
      product: productNames,
      githubPersisted: gitResult.success,
      message: `Artigo "${productNames}" publicado com sucesso!`,
    });
  } catch (error: any) {
    console.error('[PublishViral] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao publicar artigo.' },
      { status: 500 }
    );
  }
}
