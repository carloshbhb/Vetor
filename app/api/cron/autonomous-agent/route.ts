import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';
import { getAllReviews, createReview } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { fetchMLProduct, buildAffiliateUrl } from '@/lib/mercadolivre';
import { generateReview } from '@/lib/generate';
import { logger, recordMetric, createTimer } from '@/lib/monitor';
import { checkErrorRate } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export const maxDuration = 300;


export async function GET(req: NextRequest) {
  // Verify Vercel cron secret if configured (recommended for production)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return handleAutonomousCycle();
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  let authorized = false;
  const expectedUser = process.env.ADMIN_USER;
  const expectedPwd = process.env.ADMIN_PASSWORD;

  // Allow in development if no cron secret is configured and no auth is sent
  if (!cronSecret && !authHeader && process.env.NODE_ENV === 'development') {
    authorized = true;
  }

  if (authHeader) {
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      authorized = true;
    } else if (authHeader.startsWith('Basic ') && expectedUser && expectedPwd) {
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

  // Parse optional body for specific product
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
  const startTime = Date.now();
  const cycleTimer = createTimer();

  await logger.info('Autonomous cycle started', 'autonomous-agent', {
    specificProduct: specificProduct || 'auto',
    specificCategory: specificCategory || 'auto',
  });

  try {
    const reviews = await getAllReviews();
    const existingProductNames = reviews.map(r => r.product.toLowerCase());

    // Static fallback list of popular tech products
    const fallbackProducts: { [key: string]: string[] } = {
      'Wearables / Smartbands': [
        'Xiaomi Mi Band 9', 'Xiaomi Redmi Watch 5', 'Huawei Band 9',
        'Samsung Galaxy Watch 7', 'Apple Watch SE 2024', 'Amazfit Bip 5',
        'Samsung Galaxy Fit 3', 'Huawei Watch GT 4',
      ],
      'Acessórios para Games': [
        'PlayStation DualSense Edge', 'Nintendo Switch Pro Controller',
        'Teclado Mecânico Keychron K2', 'Controle Gamesir G7 SE',
        'Headset HyperX Cloud III', 'Mouse Logitech G305',
        'Cadeira Gamer DT3sports', 'Webcam Logitech C920',
      ],
      'Fones de Ouvido': [
        'Sony WF-1000XM5', 'JBL Wave Flex', 'AirPods Pro 2',
        'QCY T13', 'Samsung Galaxy Buds FE', 'JBL Tune Buds',
        'Nothing Ear (2)', 'Edifier NeoBuds Pro 2',
      ],
      'Robôs Aspiradores': [
        'Robô Aspirador Xiaomi S20', 'Robô Aspirador Kabum Smart 700',
        'Robô Aspirador Eufy G10', 'Robô Aspirador Dreame D10s',
        'Robô Aspirador ILIFE V5s Pro', 'Robô Aspirador Robot L10s',
      ],
      'Casa Inteligente': [
        'Amazon Echo Dot 5ª Geração', 'Lâmpada Inteligente Philips Hue',
        'Fechadura Eletrônica Intelbras FR 101', 'Tomada Inteligente TP-Link Kasa',
        'Alexa Echo Pop', 'Sensor de Porta Intelbras',
        'Aspirador Robô Walmart', 'Lâmpada Inteligente Xiaomi Yeelight',
      ],
      'Notebooks': [
        'Acer Nitro V 15', 'Lenovo IdeaPad 3i', 'Samsung Galaxy Book 4',
        'Dell Inspiron 15', 'ASUS VivoBook 15', 'HP 15-dy',
        'MacBook Air M3', 'Lenovo ThinkPad E14',
      ],
      'Tablets': [
        'Samsung Galaxy Tab S9 FE', 'iPad 10ª Geração', 'Xiaomi Pad 6',
        'Samsung Galaxy Tab A9', 'Lenovo Tab M11', 'iPad Air M2',
      ],
      'Câmeras de Segurança': [
        'Intelbras iM3', 'TP-Link Tapo C200', 'Xiaomi Mi Camera 2K',
        'Intelbras iD2', 'Ezviz C6C', 'Hikvision DS-2CD1043G0E-I',
      ],
    };

    // Combine all categories for retry
    const allCategories = Array.from(new Set([...Object.keys(fallbackProducts), ...reviews.map(r => r.category).filter(Boolean)]));

    // Try up to 10 times, skipping fully-reviewed categories
    let trendingProduct = '';
    let targetCategory = '';
    let attempts = 0;
    const maxAttempts = 10;
    const triedCategories = new Set<string>();

    // If specific product provided, use it directly
    if (specificProduct) {
      trendingProduct = specificProduct;
      targetCategory = specificCategory || 'Casa Inteligente';
      console.log(`[Autonomous Agent] Using specific product: ${trendingProduct} (${targetCategory})`);
    }

    while (attempts < maxAttempts && !trendingProduct) {
      attempts++;

      // Filter out categories where all products already exist
      const availableCategories = allCategories.filter(cat => {
        if (triedCategories.has(cat)) return false;
        const options = fallbackProducts[cat];
        if (!options) return true;
        const available = options.filter(p => !existingProductNames.some(ep => ep.includes(p.toLowerCase()) || p.toLowerCase().includes(ep)));
        return available.length > 0;
      });

      if (availableCategories.length === 0) {
        console.log('[Autonomous Agent] All fallback categories fully reviewed. Stopping.');
        break;
      }

      targetCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
      triedCategories.add(targetCategory);
      console.log(`[Autonomous Agent] Niche selected (attempt ${attempts}): ${targetCategory}`);

      // 2. Discover trending product
      const discoveryTimer = createTimer();
      try {
        await logger.info('Discovering trending product', 'autonomous-agent', { category: targetCategory });
        const trendPrompt = `Você é o Agente de Descoberta de Tráfego do vetor.blog.
Na categoria "${targetCategory}", qual é o produto mais popular e com maior demanda no Brasil em ${new Date().getFullYear()}?
Pense em produtos que estão em alta, com muitas avaliações positivas e boa relação custo-benefício.

IMPORTANTE: O produto DEVE ser da categoria "${targetCategory}". 
- Se a categoria é "Robôs Aspiradores", retorne apenas robôs aspiradores.
- Se a categoria é "Fones de Ouvido", retorne apenas fones de ouvido.
- Se a categoria é "Casa Inteligente", retorne apenas dispositivos de casa inteligente.
- Se a categoria é "Wearables / Smartbands", retorne apenas smartbands ou relógios inteligentes.
- NÃO retorne produtos de outras categorias (ex: geladeiras, aspiradores de pó, eletrodomésticos grandes).

Responda EXCLUSIVAMENTE com o nome exato desse produto (ex: "Sony WH-1000XM5" ou "Samsung Galaxy Fit 3"), sem pontuação, sem aspas e sem explicações.`;

        const text = await generateText({
          prompt: trendPrompt,
        });
        trendingProduct = text.trim().replace(/['\"""]/g, '');
        await logger.info('Product discovered', 'autonomous-agent', { product: trendingProduct, category: targetCategory });

        // Verify search result isn't already reviewed
        if (reviews.some(r => r.product.toLowerCase().includes(trendingProduct.toLowerCase()))) {
          await logger.warn('Product already reviewed, skipping', 'autonomous-agent', { product: trendingProduct });
          trendingProduct = '';
        }

        await recordMetric({
          agentName: 'autonomous-agent',
          operation: 'discover_product',
          durationMs: discoveryTimer.stop(),
          success: true,
        });
      } catch (searchError: any) {
        await logger.error('Product discovery failed', 'autonomous-agent', searchError, { category: targetCategory });
        await recordMetric({
          agentName: 'autonomous-agent',
          operation: 'discover_product',
          durationMs: discoveryTimer.stop(),
          success: false,
          errorMessage: searchError?.message,
        });
      }

      // Fall back to static list if search didn't produce a valid new product
      if (!trendingProduct) {
        const options = fallbackProducts[targetCategory] || ['Xiaomi Mi Band 9'];
        const available = options.filter(p => !existingProductNames.some(ep => ep.includes(p.toLowerCase()) || p.toLowerCase().includes(ep)));
        if (available.length === 0) {
          console.log(`[Autonomous Agent] All products in "${targetCategory}" already reviewed. Trying another category.`);
          trendingProduct = '';
          continue;
        }
        trendingProduct = available[Math.floor(Math.random() * available.length)];
      }

      // Sanitize product name
      if (!trendingProduct || trendingProduct.length > 80 || trendingProduct.includes('\n')) {
        trendingProduct = '';
        continue;
      }

      // Validate product matches category
      if (!validateProductCategory(trendingProduct, targetCategory)) {
        console.log(`[Autonomous Agent] ⚠️ VALIDATION FAILED: Product "${trendingProduct}" doesn't match category "${targetCategory}". Category mismatch detected. Trying fallback.`);
        trendingProduct = '';
        continue;
      } else {
        console.log(`[Autonomous Agent] ✅ Product "${trendingProduct}" validated for category "${targetCategory}"`);
      }

      // 3. Final duplicate check (skip if specific product requested)
      if (!specificProduct) {
        const exists = reviews.find(
          (r) =>
            r.product.toLowerCase().includes(trendingProduct.toLowerCase()) ||
            r.slug === slugify(trendingProduct)
        );
        if (exists) {
          console.log(`[Autonomous Agent] Review for "${trendingProduct}" already exists. Trying another category.`);
          trendingProduct = '';
        }
      }
    }

    if (!trendingProduct) {
      return NextResponse.json({
        success: false,
        message: `Não foi possível encontrar um produto novo após ${maxAttempts} tentativas.`,
      });
    }

    console.log(`[Autonomous Agent] Trending product found: ${trendingProduct}`);

    // 4. Enrich product data from Mercado Livre API
    let mlImageUrl = '';
    let mlPrice = '';
    let mlPriceOld = '';
    let mlAffiliateUrl = buildAffiliateUrl(`https://lista.mercadolivre.com.br/${encodeURIComponent(trendingProduct)}`);

    const mlTimer = createTimer();
    try {
      await logger.info('Fetching ML product data', 'autonomous-agent', { product: trendingProduct });
      const mlData = await fetchMLProduct(trendingProduct);
      if (mlData) {
        mlImageUrl = mlData.imageUrl || '';
        mlPrice = mlData.price || '';
        mlPriceOld = mlData.priceOld || '';
        mlAffiliateUrl = mlData.affiliateUrl || mlAffiliateUrl;
        await logger.info('ML enrichment success', 'autonomous-agent', { 
          product: trendingProduct, 
          hasImage: !!mlImageUrl, 
          price: mlPrice,
          source: mlData.source,
        });
      } else {
        await logger.warn('ML API returned no data', 'autonomous-agent', { product: trendingProduct });
      }
      await recordMetric({
        agentName: 'autonomous-agent',
        operation: 'ml_enrichment',
        durationMs: mlTimer.stop(),
        success: true,
      });
    } catch (mlErr: any) {
      await logger.warn('ML API fetch failed (non-fatal)', 'autonomous-agent', { product: trendingProduct, error: mlErr.message });
      await recordMetric({
        agentName: 'autonomous-agent',
        operation: 'ml_enrichment',
        durationMs: mlTimer.stop(),
        success: false,
        errorMessage: mlErr.message,
      });
    }

    // 5. Generate the review using the same flow as "Preencher com IA" button
    const generationTimer = createTimer();
    await logger.info('Generating review content', 'autonomous-agent', { product: trendingProduct, category: targetCategory });
    const generateResult = await generateReview({
      product: trendingProduct,
      category: targetCategory,
      price: mlPrice || undefined,
      old_price: mlPriceOld || undefined,
      affiliate_url: mlAffiliateUrl,
      image_url: mlImageUrl || undefined,
      marketplace: 'Mercado Livre',
      specs: 'Preencher',
      competitors: 'Concorrentes',
      tone: 'misto',
      site_name: 'Vetor Blog',
      site_url: 'https://www.vetor.blog',
      author: 'Vetor Blog',
    });

    const d = generateResult.data;
    await recordMetric({
      agentName: 'autonomous-agent',
      operation: 'generate_review',
      durationMs: generationTimer.stop(),
      success: true,
      provider: generateResult.provider,
    });
    await logger.info('Review generation completed', 'autonomous-agent', {
      product: trendingProduct,
      provider: generateResult.provider,
      seoPassed: generateResult.seo.passed,
    });

    // 6. Build full review object from generated data
    const now = new Date().toISOString();
    const reviewId = crypto.randomUUID();

    const fullReview = {
      id: reviewId,
      slug: slugify(d.meta?.slug || trendingProduct),
      status: 'published' as const,
      meta: {
        title: d.meta?.title || `Review ${trendingProduct}: Vale a Pena?`,
        description: d.meta?.description || `Análise completa do ${trendingProduct}.`,
        keywords: d.meta?.keywords || trendingProduct,
        readingTime: d.meta?.reading_time || 8,
        canonical: d.meta?.canonical || null,
        ogImage: d.meta?.og_image || null,
      },
      product: d.product || trendingProduct,
      category: d.category || targetCategory,
      marketplace: d.marketplace || 'Mercado Livre',
      priceOld: d.priceOld || d.old_price || '',
      priceNew: d.priceNew || d.price || '',
      affiliateUrl: mlAffiliateUrl,
      imageUrl: mlImageUrl || d.imageUrl || '',
      adsEnabled: false,
      hero: {
        headlineLine1: d.hero?.headline_line1 || trendingProduct.toUpperCase(),
        headlineLine2: d.hero?.headline_line2 || 'VALE A PENA COMPRAR?',
        headlineEm: d.hero?.headline_em || trendingProduct,
        lead: d.hero?.lead || `Análise completa do ${trendingProduct}.`,
        overallScore: d.hero?.overall_score || 8.5,
        bars: d.hero?.bars?.map((b: any) => ({ label: b.label, value: b.value, pct: b.pct ?? b.value * 10 })) || [],
      },
      specs: d.specs || [],
      sections: d.sections?.map((s: any) => ({
        id: s.id, heading: s.heading,
        tocLabel: s.toc_label, tocEmoji: s.toc_emoji, content: s.content,
      })) || [],
      compareTable: d.compare ? {
        caption: d.compare.caption,
        columns: d.compare.columns,
        winnerCol: d.compare.winner_col,
        rows: d.compare.rows,
      } : { caption: '', columns: [], winnerCol: 1, rows: [] },
      pros: d.pros || [],
      cons: d.cons || [],
      testimonials: [],
      faq: d.faq || [],
      verdict: {
        score: d.verdict?.score || 8.5,
        label: d.verdict?.label || 'BOM CUSTO-BENEFÍCIO',
        text: d.verdict?.text || `O ${trendingProduct} é uma excelente compra.`,
        note: d.verdict?.note || 'Boa relação custo-benefício.',
      },
      schemaRating: {
        ratingValue: d.schemas?.aggregate_rating?.rating_value || 4.5,
        reviewCount: d.schemas?.aggregate_rating?.review_count || 5000,
      },
      googleRank: 0,
      lastRankCheck: now,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Save to database using createReview from db.ts (handles Supabase + file fallback)
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
      await logger.info('Review saved to database', 'autonomous-agent', { product: trendingProduct, reviewId });
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

    // 8. Commit to GitHub → triggers Vercel redeploy with persistent data
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
      await logger.info('GitHub commit successful', 'autonomous-agent', { product: trendingProduct });
    } else {
      await logger.warn('GitHub commit failed', 'autonomous-agent', { product: trendingProduct, error: gitResult.error });
    }

    const totalDuration = cycleTimer.stop();
    await recordMetric({
      agentName: 'autonomous-agent',
      operation: 'full_cycle',
      durationMs: totalDuration,
      success: true,
      provider: generateResult.provider,
    });

    await logger.info('Autonomous cycle completed', 'autonomous-agent', {
      product: trendingProduct,
      category: targetCategory,
      provider: generateResult.provider,
      seoPassed: generateResult.seo.passed,
      githubPersisted: gitResult.success,
      durationMs: totalDuration,
    });

    // Check error rate and trigger alert if needed
    await checkErrorRate('autonomous-agent');

    return NextResponse.json({
      success: true,
      category: targetCategory,
      product: trendingProduct,
      slug: fullReview.slug,
      provider: generateResult.provider,
      seoPassed: generateResult.seo.passed,
      githubPersisted: gitResult.success,
      elapsedSeconds: (totalDuration / 1000).toFixed(1),
      message: `Artigo "${trendingProduct}" gerado e publicado autonomamente.`,
    });
  } catch (error: any) {
    const totalDuration = cycleTimer.stop();
    await logger.critical('Autonomous cycle failed', 'autonomous-agent', error, {
      product: specificProduct || 'auto',
      category: specificCategory || 'auto',
      durationMs: totalDuration,
    });
    await recordMetric({
      agentName: 'autonomous-agent',
      operation: 'full_cycle',
      durationMs: totalDuration,
      success: false,
      errorMessage: error.message,
    });

    // Check error rate after failure
    await checkErrorRate('autonomous-agent');

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

export function validateProductCategory(product: string, category: string): boolean {
  const productLower = product.toLowerCase();
  
  // Category-specific validation rules
  const categoryRules: Record<string, { keywords: string[]; excludeKeywords: string[] }> = {
    'Robôs Aspiradores': {
      keywords: ['aspirador', 'robô', 'robo', 'robot', 'vacuum', 'cleaner', 'robo'],
      excludeKeywords: ['geladeira', 'refrigerador', 'freezer', 'air fryer', 'liquidificador'],
    },
    'Fones de Ouvido': {
      keywords: ['fone', 'headphone', 'earphone', 'earbuds', 'airpods', 'buds', 'xm5', 'wh-1000', 'wf-1000'],
      excludeKeywords: ['aspirador', 'geladeira', 'tv', 'monitor', 'teclado', 'mouse', 'watch', 'band'],
    },
    'Casa Inteligente': {
      keywords: ['inteligente', 'smart', 'alexa', 'echo', 'google home', 'sensor', 'tomada', 'lâmpada', 'lampada'],
      excludeKeywords: ['aspirador', 'geladeira', 'cooktop', 'fogão', 'fogao'],
    },
    'Wearables / Smartbands': {
      keywords: ['watch', 'band', 'smartband', 'pulseira', 'relógio', 'relogio', 'fitbit', 'galaxy fit', 'mi band'],
      excludeKeywords: ['aspirador', 'geladeira', 'fone', 'headphone'],
    },
    'Notebooks': {
      keywords: ['notebook', 'laptop', 'ultrabook', 'macbook', 'ideapad', 'nitro', 'vivobook'],
      excludeKeywords: ['aspirador', 'geladeira', 'tablet', 'ipad', 'fone'],
    },
    'Tablets': {
      keywords: ['tablet', 'ipad', 'galaxy tab'],
      excludeKeywords: ['aspirador', 'geladeira', 'notebook', 'macbook', 'laptop', 'fone'],
    },
    'Câmeras de Segurança': {
      keywords: ['câmera', 'camera', 'cctv', 'segurança', 'seguranca', 'ip camera', 'tapo', 'im3', 'id2'],
      excludeKeywords: ['aspirador', 'geladeira', 'fone', 'watch', 'band'],
    },
    'Eletroportáteis': {
      keywords: ['air fryer', 'liquidificador', 'aspirador', 'cafeteira', 'torradeira', 'batedeira', 'ar fryer'],
      excludeKeywords: ['geladeira', 'refrigerador', 'freezer', 'cooktop', 'fogão', 'fogao', 'lava-louças'],
    },
  };

  const rules = categoryRules[category];
  if (!rules) {
    // If no specific rules for category, allow by default
    return true;
  }

  // Check if product contains exclude keywords
  const hasExcludedKeyword = rules.excludeKeywords.some(keyword => 
    productLower.includes(keyword.toLowerCase())
  );
  
  if (hasExcludedKeyword) {
    return false;
  }

  // Check if product contains at least one category keyword
  const hasCategoryKeyword = rules.keywords.some(keyword => 
    productLower.includes(keyword.toLowerCase())
  );
  
  return hasCategoryKeyword;
}
