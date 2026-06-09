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

    // Map sections to proper format with markdown content
    const sections = d.sections?.map((s: any, idx: number) => ({
      id: s.id || `section-${idx}`,
      heading: s.heading || s.toc_label || `Seção ${idx + 1}`,
      tocLabel: s.toc_label || s.heading || `Seção ${idx + 1}`,
      tocEmoji: s.toc_emoji || '📌',
      content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content || ''),
    })) || [];

    // Map compareTable rows to {feature, values[], winner} format
    let compareTable = d.compareTable || { caption: '', columns: [], winnerCol: 1, rows: [] };
    if (compareTable.rows && Array.isArray(compareTable.rows)) {
      compareTable = {
        ...compareTable,
        rows: compareTable.rows.map((row: any) => {
          // Already in correct format
          if (row && typeof row === 'object' && !Array.isArray(row) && 'feature' in row && 'values' in row) {
            return row;
          }
          // Array format: ["Feature", "Val1", "Val2", ...]
          if (Array.isArray(row)) {
            const feature = row[0] || '';
            const values = row.slice(1);
            // Determine winner: use compareTable.winnerCol (1-based) or default to 1
            const winnerCol = compareTable.winnerCol && compareTable.winnerCol > 0 ? compareTable.winnerCol : 1;
            return { feature, values, winner: winnerCol };
          }
          return { feature: '', values: [], winner: 0 };
        }),
      };
    }

    // Collect all pros and cons from products
    const allPros: string[] = [];
    const allCons: string[] = [];
    if (d.products && Array.isArray(d.products)) {
      for (const product of d.products) {
        if (product.pros && Array.isArray(product.pros)) {
          allPros.push(...product.pros);
        }
        if (product.cons && Array.isArray(product.cons)) {
          allCons.push(...product.cons);
        }
      }
    }

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
        bars: d.hero?.bars?.map((b: any) => ({
          label: b.label,
          value: b.value,
          pct: b.pct ?? b.value * 10,
        })) || [],
      },
      specs: d.specs || [],
      sections,
      compareTable,
      pros: allPros.length > 0 ? allPros : ['Produto bem avaliado', 'Boa relação custo-benefício', 'Disponível no mercado brasileiro'],
      cons: allCons.length > 0 ? allCons : ['Pode não atender a todos os perfis', 'Preço pode variar'],
      testimonials: [],
      faq: d.faq || [],
      verdict: {
        score: d.verdict?.score || 8.5,
        label: d.verdict?.label || 'MELHOR ESCOLHA',
        text: d.verdict?.text || 'Artigo comparativo com as melhores opções.',
        note: d.verdict?.note || 'Confira nossa análise completa.',
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
