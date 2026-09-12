import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateViralArticle } from '@/lib/generate-viral';
import { createReview, getLightweightReviews } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { resolveProductImage, isImageReachable } from '@/lib/mercadolivre';
import { submitUrl } from '@/lib/indexnow';
import { indexNewReview } from '@/lib/google-indexing';
import { recordMetric, createTimer } from '@/lib/monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CATEGORIES = [
  'Smartphones',
  'Fones de Ouvido',
  'Notebooks',
  'Wearables',
  'Casa Inteligente',
  'Robôs Aspiradores',
  'Eletroportateis',
  'Acessorios Gamer',
  'Tablets',
];

const ARTICLES_PER_RUN = 2;

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

async function discoverTrendingTopics(category: string): Promise<any[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(`[ViralContent] No GEMINI_API_KEY for trend discovery`);
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Você é o Agente de Tendências de SEO da vetor.blog. Pesquise na internet do Brasil em tempo real (2026) sobre pautas de TRÁFEGO VIRAL (Comparativos X vs Y, Listicles de "Melhores" e guias de compra) na categoria "${category}".
Identifique as 5 melhores ideias de artigos de tráfego que atrairiam grande audiência orgânica:
1. Comparativos diretos de produtos populares (ex: "Xiaomi Mi Band 9 vs Samsung Galaxy Fit 3").
2. Listicles de compra focados em orçamento ou custo-benefício (ex: "Top 5 Fones de Ouvido por menos de R$ 300").
3. Dúvidas quentes com alta intenção de busca (ex: "Robô aspirador realmente funciona para quem tem pet?").

Para cada pauta, retorne JSON estrito:
- product: Título chamativo para o artigo.
- keywords: Lista com 3-4 palavras-chave associadas.
- difficulty: "Baixa", "Média" ou "Alta".
- volume: "Baixo", "Médio" ou "Alto".
- cpc: Estimativa de valor comercial (ex: "R$ 1,80").
- gapAnalysis: O que o leitor busca e como o artigo deve fisgar o clique.

Responda APENAS com um array JSON válido contendo os 5 objetos.`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    console.log(`[ViralContent] Gemini response for ${category}: ${text.slice(0, 200)}`);
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    console.warn(`[ViralContent] Trend discovery failed for ${category}:`, err.message);
    return [];
  }
}

async function publishArticle(articleData: any, category: string): Promise<{ slug: string; success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const reviewId = crypto.randomUUID();
  const d = articleData;

  const slug = slugify(d.meta?.title || 'artigo-comparativo');
  const productNameList: string[] = d.products?.map((p: any) => p.name) || [];
  const productNames = productNameList.join(' vs ') || 'Comparativo';
  const resolvedImages: string[] = [];
  for (const pname of productNameList) {
    let imgUrl = pname ? await resolveProductImage(pname) : { imageUrl: '' };
    if (!imgUrl.imageUrl) {
      imgUrl = d.products?.[0] ? await resolveProductImage(d.products[0].name) : { imageUrl: '' };
    }
    resolvedImages.push(imgUrl.imageUrl);
  }
  const mainImageUrl = resolvedImages[0] || '';
  if (!mainImageUrl) {
    return { slug, success: false, error: `Sem imagem para "${productNameList.join(', ')}"` };
  }

  // Per-product affiliate URLs (joined by |||)
  const affiliateUrls: string[] = (d.products || []).map((p: any) => p.affiliate_url || '');
  const combinedAffiliateUrl = affiliateUrls.filter(Boolean).join('|||') || d.products?.[0]?.affiliate_url || '';

  // Build hero bars with per-product image URLs
  const heroBars = (d.hero?.bars || []).map((bar: any, idx: number) => ({
    label: bar.label || productNameList[idx] || '',
    value: bar.value || 8,
    pct: bar.pct ?? (bar.value || 8) * 10,
    imageUrl: resolvedImages[idx] || '',
  }));
  // Ensure we have at least one bar per product
  for (let i = heroBars.length; i < productNameList.length; i++) {
    heroBars.push({ label: productNameList[i], value: 8, pct: 80, imageUrl: resolvedImages[i] || '' });
  }

  const sections = d.sections?.map((s: any, idx: number) => ({
    id: s.id || `section-${idx}`,
    heading: s.heading || s.toc_label || `Seção ${idx + 1}`,
    tocLabel: s.toc_label || s.heading || `Seção ${idx + 1}`,
    tocEmoji: s.toc_emoji || '📌',
    content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content || ''),
  })) || [];

  let compareTable = d.compareTable || { caption: '', columns: [], winnerCol: 1, rows: [] };
  if (compareTable.rows && Array.isArray(compareTable.rows)) {
    compareTable = {
      ...compareTable,
      rows: compareTable.rows.map((row: any) => {
        if (row && typeof row === 'object' && !Array.isArray(row) && 'feature' in row && 'values' in row) return row;
        if (Array.isArray(row)) {
          const feature = row[0] || '';
          const values = row.slice(1);
          const winnerCol = compareTable.winnerCol && compareTable.winnerCol > 0 ? compareTable.winnerCol : 1;
          return { feature, values, winner: winnerCol };
        }
        return { feature: '', values: [], winner: 0 };
      }),
    };
  }

  const allPros: string[] = [];
  const allCons: string[] = [];
  if (d.products && Array.isArray(d.products)) {
    for (const product of d.products) {
      if (product.pros && Array.isArray(product.pros)) allPros.push(...product.pros);
      if (product.cons && Array.isArray(product.cons)) allCons.push(...product.cons);
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
    category: category || 'Comparativos',
    marketplace: 'Multi',
    priceOld: d.products?.[0]?.old_price || '',
    priceNew: d.products?.[0]?.price || '',
    affiliateUrl: combinedAffiliateUrl,
    imageUrl: mainImageUrl,
    adsEnabled: true,
    hero: {
      headlineLine1: d.hero?.headline_line1 || 'COMPARATIVO',
      headlineLine2: d.hero?.headline_line2 || 'QUAL O MELHOR?',
      headlineEm: d.hero?.headline_em || productNames,
      lead: d.hero?.lead || '',
      overallScore: d.hero?.overall_score || 8.5,
      bars: heroBars,
    },
    specs: d.specs || [],
    sections,
    compareTable,
    pros: allPros.length > 0 ? allPros : ['Produto bem avaliado', 'Boa relação custo-benefício'],
    cons: allCons.length > 0 ? allCons : ['Pode não atender a todos os perfis'],
    testimonials: [],
    faq: d.faq || [],
    verdict: {
      score: d.verdict?.score || 8.5,
      label: d.verdict?.label || 'MELHOR ESCOLHA',
      text: d.verdict?.text || 'Artigo comparativo com as melhores opções.',
      note: d.verdict?.note || 'Confira nossa análise completa.',
    },
    schemaRating: { ratingValue: d.verdict?.score || 8.5, reviewCount: 1000 },
    googleRank: 0,
    lastRankCheck: now,
    createdAt: now,
    updatedAt: now,
  };

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

  await commitNewReviewToGitHub(fullReview);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  submitUrl(`${siteUrl}/review/${fullReview.slug}`).catch(() => {});
  indexNewReview(fullReview.slug).catch(() => {});

  return { slug: fullReview.slug, success: true };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || req.nextUrl.searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cycleTimer = createTimer();
  const results: any[] = [];
  const errors: any[] = [];

  // Pick random categories for this run
  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  const categoriesToProcess = shuffled.slice(0, 3);

  // Check existing slugs to avoid duplicates
  const existingReviews = await getLightweightReviews();
  const existingSlugs = new Set(existingReviews.map(r => r.slug));

  let articlesGenerated = 0;

  for (const category of categoriesToProcess) {
    if (articlesGenerated >= ARTICLES_PER_RUN) break;

    try {
      console.log(`[ViralContent] Discovering trends for ${category}...`);
      const trends = await discoverTrendingTopics(category);
      console.log(`[ViralContent] Found ${trends.length} trends for ${category}`);
      if (trends.length === 0) {
        continue;
      }

      // Pick the best trend (first one, already sorted by relevance)
      const trend = trends[0];
      const trendSlug = slugify(trend.product || '');
      console.log(`[ViralContent] Best trend: ${trend.product} (slug: ${trendSlug})`);

      // Skip if already exists
      if (existingSlugs.has(trendSlug)) {
        console.log(`[ViralContent] ${trendSlug} already exists, trying next trend...`);
        // Try next trends
        for (let i = 1; i < Math.min(trends.length, 3); i++) {
          const altTrend = trends[i];
          const altSlug = slugify(altTrend.product || '');
          if (!existingSlugs.has(altSlug)) {
            trends[0] = altTrend;
            break;
          }
        }
        if (existingSlugs.has(slugify(trends[0].product || ''))) {
          console.log(`[ViralContent] All trends for ${category} already exist, skipping.`);
          continue;
        }
      }

      console.log(`[ViralContent] Generating article: ${trend.product}`);
      const genTimer = createTimer();

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
      let genResult = null;
      let lastError = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          genResult = await generateViralArticle({
            category,
            products: [trend.product, ...(trends.slice(1, 3).map(t => t.product))],
            type: trend.product.includes('vs') || trend.product.includes('Comparativo') ? 'comparativo' : 'top5',
            affiliate_urls: {} as Record<string, string>,
            site_name: 'Vetor Blog',
            site_url: siteUrl,
          });
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[ViralContent] Generation attempt ${attempt}/3 failed: ${err.message}`);
          if (attempt < 3) {
            console.log(`[ViralContent] Waiting 30s before retry...`);
            await new Promise(r => setTimeout(r, 30000));
          }
        }
      }

      if (!genResult) {
        errors.push({ category, product: trend.product, error: lastError?.message || 'Generation failed' });
        console.warn(`[ViralContent] All generation attempts failed for ${trend.product}`);
        continue;
      }

      await recordMetric({
        agentName: 'viral-content',
        operation: 'generate_article',
        durationMs: genTimer.stop(),
        success: true,
        provider: genResult.provider,
      });

      console.log(`[ViralContent] Publishing article...`);
      const pubResult = await publishArticle(genResult.data, category);

      if (pubResult.success) {
        articlesGenerated++;
        results.push({ category, slug: pubResult.slug, product: trend.product });
        existingSlugs.add(pubResult.slug);
        console.log(`[ViralContent] Published: ${pubResult.slug}`);
      } else {
        errors.push({ category, product: trend.product, error: pubResult.error });
        console.warn(`[ViralContent] Failed to publish: ${pubResult.error}`);
      }
    } catch (err: any) {
      console.error(`[ViralContent] Error processing ${category}:`, err.message);
      errors.push({ category, error: err.message });
    }
  }

  const elapsedMs = cycleTimer.stop();
  await recordMetric({
    agentName: 'viral-content',
    operation: 'full_cycle',
    durationMs: elapsedMs,
    success: errors.length === 0,
  });

  return NextResponse.json({
    success: true,
    articlesGenerated,
    results,
    errors,
    elapsedSeconds: Math.round(elapsedMs / 1000),
    message: `${articlesGenerated} artigo(s) viral(is) publicado(s).`,
  });
}
