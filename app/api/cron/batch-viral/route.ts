import { NextRequest, NextResponse } from 'next/server';
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
  'Smartphones', 'Fones de Ouvido', 'Notebooks', 'Wearables', 'Casa Inteligente',
  'Robôs Aspiradores', 'Eletroportateis', 'Acessorios Gamer', 'Tablets',
  'Câmeras', 'Gaming', 'Refrigeracao', 'Audio', 'Smartwatches', 'Impressoras',
  'Monitores', 'Teclados', 'Mouses', 'Webcams', 'Microfones',
];

const ARTICLES_PER_BATCH = 20;

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\breview\b/gi, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').replace(/-+/g, '-');
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

  const existingReviews = await getLightweightReviews();
  const existingSlugs = new Set(existingReviews.map(r => r.slug));

  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  const categoriesToProcess = shuffled.slice(0, Math.min(ARTICLES_PER_BATCH, shuffled.length));

  // Process all categories concurrently (within Vercel limits)
  const promises = categoriesToProcess.map(async (category) => {
    try {
      const trendPrompt = `Pesquise a melhor tendência viral na categoria ${category} em 2026. Retorne JSON com product, keywords, difficulty.`;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return { category, error: 'No GEMINI_API_KEY' };

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const resp = await model.generateContent(trendPrompt);
      const cleanJson = resp.response.text().replace(/```json|```/g, '').trim();
      const trends = JSON.parse(cleanJson);
      const trend = Array.isArray(trends) ? trends[0] : trends;
      if (!trend) return { category, error: 'No trend' };

      const trendSlug = slugify(trend.product || '');
      if (existingSlugs.has(trendSlug)) return { category, slug: trendSlug, skipped: 'exists' };

      const genResult = await generateViralArticle({
        category,
        products: [trend.product],
        type: 'top5',
        affiliate_urls: {} as Record<string, string>,
        site_name: 'Vetor Blog',
        site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog',
      });

      const now = new Date().toISOString();
      const d = genResult.data;
      const slug = slugify(d.meta?.title || 'artigo-comparativo');
      const productNames = d.products?.map((p: any) => p.name).join(' vs ') || 'Comparativo';

      // Resolve per-product images
      const resolvedImages: string[] = [];
      const productNameList: string[] = d.products?.map((p: any) => p.name) || [];
      for (const pname of productNameList) {
        const img = pname ? await resolveProductImage(pname) : { imageUrl: '' };
        resolvedImages.push(img.imageUrl);
      }
      const mainImageUrl = resolvedImages[0] || '';
      if (!mainImageUrl) return { category, slug, error: 'No image' };

      const affiliateUrls: string[] = (d.products || []).map((p: any) => p.affiliate_url || '');
      const combinedAffiliateUrl = affiliateUrls.filter(Boolean).join('|||') || '';
      const heroBars = (d.hero?.bars || []).map((bar: any, idx: number) => ({
        label: bar.label || productNameList[idx] || '',
        value: bar.value || 8, pct: bar.pct ?? (bar.value || 8) * 10, imageUrl: resolvedImages[idx] || '',
      }));
      const compareTable = d.compareTable || { caption: '', columns: [], winnerCol: 1, rows: [] };
      const sections = d.sections?.map((s: any, idx: number) => ({
        id: s.id || `section-${idx}`, heading: s.heading || `Seção ${idx + 1}`,
        tocLabel: s.toc_label || s.heading || `Seção ${idx + 1}`, tocEmoji: s.toc_emoji || '📌',
        content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content || ''),
      })) || [];
      const allPros: string[] = []; const allCons: string[] = [];
      if (d.products && Array.isArray(d.products)) {
        for (const p of d.products) { if (p.pros) allPros.push(...p.pros); if (p.cons) allCons.push(...p.cons); }
      }

      const fullReview = {
        id: crypto.randomUUID(), slug, status: 'published' as const,
        meta: { title: d.meta?.title || 'Artigo Comparativo', description: d.meta?.description || '', keywords: d.meta?.keywords || '', readingTime: d.meta?.reading_time || 10, canonical: d.meta?.canonical || null, ogImage: d.meta?.og_image || null },
        product: productNames, category, marketplace: 'Multi',
        priceOld: d.products?.[0]?.old_price || '', priceNew: d.products?.[0]?.price || '',
        affiliateUrl: combinedAffiliateUrl, imageUrl: mainImageUrl, adsEnabled: true,
        hero: { headlineLine1: d.hero?.headline_line1 || 'COMPARATIVO', headlineLine2: d.hero?.headline_line2 || 'QUAL O MELHOR?', headlineEm: d.hero?.headline_em || productNames, lead: d.hero?.lead || '', overallScore: d.hero?.overall_score || 8.5, bars: heroBars },
        specs: d.specs || [], sections, compareTable, pros: allPros, cons: allCons, testimonials: [], faq: d.faq || [],
        verdict: { score: d.verdict?.score || 8.5, label: d.verdict?.label || 'MELHOR ESCOLHA', text: d.verdict?.text || 'Artigo comparativo.', note: d.verdict?.note || '' },
        schemaRating: { ratingValue: d.verdict?.score || 8.5, reviewCount: 1000 }, googleRank: 0, lastRankCheck: now, createdAt: now, updatedAt: now,
      };

      await createReview(fullReview);
      await commitNewReviewToGitHub(fullReview);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
      submitUrl(`${siteUrl}/review/${slug}`).catch(() => {});
      indexNewReview(slug).catch(() => {});
      existingSlugs.add(slug);

      return { category, slug, success: true };
    } catch (err: any) {
      return { category, error: err.message?.slice(0, 100) };
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      const val = r.value;
      if (val.success || val.skipped) results.push(val);
      else errors.push(val);
    } else {
      errors.push({ error: r.reason?.message || 'Unknown' });
    }
  }

  const elapsedMs = cycleTimer.stop();
  await recordMetric({ agentName: 'batch-viral', operation: 'full_batch', durationMs: elapsedMs, success: errors.length === 0 });

  return NextResponse.json({ success: true, generated: results.length, results, errors, elapsedSeconds: Math.round(elapsedMs / 1000) });
}
