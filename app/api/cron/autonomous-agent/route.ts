import { NextRequest, NextResponse } from 'next/server';
import { discoverProduct } from '@/lib/discovery';
import { generateReview } from '@/lib/generate';
import { optimizeReviewSEO } from '@/lib/seo-review';
import { createReview, getLightweightReviews } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { submitUrl } from '@/lib/indexnow';
import { indexNewReview } from '@/lib/google-indexing';
import { logger, recordMetric, createTimer } from '@/lib/monitor';
import { checkErrorRate } from '@/lib/alerts';

export { validateProductCategory } from '@/lib/discovery';

export const dynamic = 'force-dynamic';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleAutonomousCycle();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  let authorized = false;
  const expectedUser = process.env.ADMIN_USER;
  const expectedPwd = process.env.ADMIN_PASSWORD;

  if (process.env.NODE_ENV === 'development') {
    authorized = true;
  }

  if (authHeader) {
    if (authHeader.startsWith('Basic ') && expectedUser && expectedPwd) {
      try {
        const authValue = authHeader.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');
        if (user === expectedUser && pwd === expectedPwd) {
          authorized = true;
        }
      } catch (e) {
        console.warn('[Autonomous Agent] Failed to parse Basic Auth header:', e);
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let specificProduct = '';
  let specificCategory = '';
  try {
    const body = await req.json();
    specificProduct = body.product || '';
    specificCategory = body.category || '';
  } catch {
    // No body or invalid JSON - proceed with autonomous selection
  }

  return handleAutonomousCycle(specificProduct, specificCategory);
}

export async function handleAutonomousCycle(specificProduct: string = '', specificCategory: string = '') {
  const cycleTimer = createTimer();

  await logger.info('Autonomous cycle started', 'autonomous-agent', {
    specificProduct: specificProduct || 'auto',
    specificCategory: specificCategory || 'auto',
  });

  try {
    const discovery = await discoverProduct({ specificProduct, specificCategory });
    await logger.info('Product discovered', 'autonomous-agent', {
      product: discovery.product,
      category: discovery.category,
      source: discovery.source,
    });

    const existingReviews = await getLightweightReviews();
    const existingSlugs = existingReviews.map(r => r.slug);
    const existingCategories = Array.from(new Set(existingReviews.map(r => r.category).filter(Boolean)));

    const generateResult = await generateReview({
      product: discovery.product,
      category: discovery.category,
      price: discovery.price || undefined,
      old_price: discovery.priceOld || undefined,
      affiliate_url: discovery.affiliateUrl,
      image_url: discovery.imageUrl || undefined,
      marketplace: discovery.marketplace,
      specs: 'Preencher',
      competitors: 'Concorrentes',
      tone: 'misto',
      site_name: 'Vetor Blog',
      site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog',
      author: 'Vetor Blog',
      existingCategories,
    });

    const seoOutput = optimizeReviewSEO(generateResult.data, existingSlugs);

    const reviewId = crypto.randomUUID();
    const now = new Date().toISOString();
    const fullReview = {
      id: reviewId,
      slug: generateResult.data.meta?.slug || slugify(discovery.product),
      status: 'published' as const,
      meta: {
        ...generateResult.data.meta,
        ...seoOutput.meta,
        readingTime: generateResult.data.meta?.reading_time || 8,
        canonical: seoOutput.meta.canonical,
        ogImage: generateResult.data.meta?.og_image || null,
      },
      product: generateResult.data.product || discovery.product,
      category: generateResult.data.category || discovery.category,
      marketplace: generateResult.data.marketplace || discovery.marketplace,
      priceOld: generateResult.data.priceOld || generateResult.data.old_price || discovery.priceOld,
      priceNew: generateResult.data.priceNew || generateResult.data.price || discovery.price,
      affiliateUrl: discovery.affiliateUrl,
      imageUrl: discovery.imageUrl,
      adsEnabled: false,
      hero: {
        headlineLine1: generateResult.data.hero?.headline_line1 || discovery.product.toUpperCase(),
        headlineLine2: generateResult.data.hero?.headline_line2 || 'VALE A PENA COMPRAR?',
        headlineEm: generateResult.data.hero?.headline_em || discovery.product,
        lead: generateResult.data.hero?.lead || `Análise completa do ${discovery.product}.`,
        overallScore: generateResult.data.hero?.overall_score || 8.5,
        bars: generateResult.data.hero?.bars?.map((b: any) => ({ label: b.label, value: b.value, pct: b.pct ?? b.value * 10 })) || [],
      },
      specs: generateResult.data.specs || [],
      sections: generateResult.data.sections?.map((s: any) => ({
        id: s.id,
        heading: s.heading,
        tocLabel: s.toc_label,
        tocEmoji: s.toc_emoji,
        content: s.content,
      })) || [],
      compareTable: generateResult.data.compare ? {
        caption: generateResult.data.compare.caption,
        columns: generateResult.data.compare.columns,
        winnerCol: generateResult.data.compare.winner_col,
        rows: generateResult.data.compare.rows,
      } : { caption: '', columns: [], winnerCol: 1, rows: [] },
      pros: generateResult.data.pros || [],
      cons: generateResult.data.cons || [],
      testimonials: [],
      faq: generateResult.data.faq || [],
      verdict: {
        score: generateResult.data.verdict?.score || 8.5,
        label: generateResult.data.verdict?.label || 'BOM CUSTO-BENEFÍCIO',
        text: generateResult.data.verdict?.text || `O ${discovery.product} é uma excelente compra.`,
        note: generateResult.data.verdict?.note || 'Boa relação custo-benefício.',
      },
      schemaRating: {
        ratingValue: generateResult.data.schemas?.aggregate_rating?.rating_value || 4.5,
        reviewCount: generateResult.data.schemas?.aggregate_rating?.review_count || 5000,
      },
      googleRank: 0,
      lastRankCheck: now,
      createdAt: now,
      updatedAt: now,
    };

    const dbTimer = createTimer();
    try {
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
      await recordMetric({
        agentName: 'autonomous-agent',
        operation: 'save_to_database',
        durationMs: dbTimer.stop(),
        success: true,
      });
      await logger.info('Review saved to database', 'autonomous-agent', {
        product: discovery.product,
        reviewId,
      });
    } catch (dbError: unknown) {
      const message = dbError instanceof Error ? dbError.message : 'Unknown DB error';
      await logger.error('Database insert failed', 'autonomous-agent', new Error(message));
      await recordMetric({
        agentName: 'autonomous-agent',
        operation: 'save_to_database',
        durationMs: dbTimer.stop(),
        success: false,
        errorMessage: message,
      });
      throw new Error(`Database insert failed: ${message}`);
    }

    const gitTimer = createTimer();
    const gitResult = await commitNewReviewToGitHub(fullReview);
    await recordMetric({
      agentName: 'autonomous-agent',
      operation: 'github_commit',
      durationMs: gitTimer.stop(),
      success: gitResult.success,
      errorMessage: gitResult.error || undefined,
    });

    if (gitResult.success) {
      await logger.info('GitHub commit successful', 'autonomous-agent', {
        product: discovery.product,
      });
    } else {
      await logger.warn('GitHub commit failed', 'autonomous-agent', {
        product: discovery.product,
        error: gitResult.error,
      });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
    const reviewUrl = `${siteUrl}/review/${fullReview.slug}`;
    submitUrl(reviewUrl).catch(() => {});
    indexNewReview(fullReview.slug).catch(() => {});

    const elapsedMs = cycleTimer.stop();
    await recordMetric({
      agentName: 'autonomous-agent',
      operation: 'full_cycle',
      durationMs: elapsedMs,
      success: true,
      provider: generateResult.provider,
    });

    await logger.info('Autonomous cycle completed', 'autonomous-agent', {
      product: discovery.product,
      category: discovery.category,
      provider: generateResult.provider,
      seoPassed: generateResult.seo.passed,
      githubPersisted: gitResult.success,
      elapsedSeconds: Math.round(elapsedMs / 1000),
    });

    checkErrorRate('autonomous-agent').catch(() => {});

    return NextResponse.json({
      success: true,
      category: discovery.category,
      product: discovery.product,
      slug: fullReview.slug,
      provider: generateResult.provider,
      seoPassed: generateResult.seo.passed,
      githubPersisted: gitResult.success,
      elapsedSeconds: Math.round(elapsedMs / 1000),
      message: `Artigo "${discovery.product}" gerado e publicado autonomamente.`,
    });
  } catch (error: any) {
    const elapsedMs = cycleTimer.stop();
    await logger.error('Autonomous cycle failed', 'autonomous-agent', error, {
      product: specificProduct || 'auto',
      category: specificCategory || 'auto',
      durationMs: elapsedMs,
    });
    await recordMetric({
      agentName: 'autonomous-agent',
      operation: 'full_cycle',
      durationMs: elapsedMs,
      success: false,
      errorMessage: error.message,
    });

    checkErrorRate('autonomous-agent').catch(() => {});

    return NextResponse.json(
      { error: 'Erro no agente autônomo: ' + error.message },
      { status: 500 }
    );
  }
}

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
