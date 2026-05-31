import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';
import { getAllReviews, createReview } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { buildPrompt } from '@/lib/prompt';
import { fetchMLProduct, buildAffiliateUrl } from '@/lib/mercadolivre';

export const dynamic = 'force-dynamic';

export const maxDuration = 120;


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
  const expectedUser = process.env.ADMIN_USER || 'admin';
  const expectedPwd = process.env.ADMIN_PASSWORD || 'vetor123';

  // Allow in development if no cron secret is configured and no auth is sent
  if (!cronSecret && !authHeader && process.env.NODE_ENV === 'development') {
    authorized = true;
  }

  if (authHeader) {
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      authorized = true;
    } else if (authHeader.startsWith('Basic ')) {
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

  return handleAutonomousCycle();
}

export async function handleAutonomousCycle() {
  const startTime = Date.now();

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
      try {
        const trendPrompt = `Você é o Agente de Descoberta de Tráfego do vetor.blog.
Na categoria "${targetCategory}", qual é o produto mais popular e com maior demanda no Brasil em ${new Date().getFullYear()}?
Pense em produtos que estão em alta, com muitas avaliações positivas e boa relação custo-benefício.
Responda EXCLUSIVAMENTE com o nome exato desse produto (ex: "Sony WH-1000XM5" ou "Samsung Galaxy Fit 3"), sem pontuação, sem aspas e sem explicações.`;

        const text = await generateText({
          prompt: trendPrompt,
        });
        trendingProduct = text.trim().replace(/['\"""]/g, '');

        // Verify search result isn't already reviewed
        if (reviews.some(r => r.product.toLowerCase().includes(trendingProduct.toLowerCase()))) {
          console.log(`[Autonomous Agent] Search returned already-reviewed "${trendingProduct}". Trying fallback.`);
          trendingProduct = '';
        }
      } catch (searchError: any) {
        console.warn(
          '[Autonomous Agent] Search Grounding failed, using fallback list:',
          searchError?.message || searchError
        );
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

      // 3. Final duplicate check
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

    try {
      console.log(`[Autonomous Agent] Fetching ML product data for: "${trendingProduct}"`);
      const mlData = await fetchMLProduct(trendingProduct);
      if (mlData) {
        mlImageUrl = mlData.imageUrl || '';
        mlPrice = mlData.price || '';
        mlPriceOld = mlData.priceOld || '';
        mlAffiliateUrl = mlData.affiliateUrl || mlAffiliateUrl;
        console.log(`[Autonomous Agent] ✅ ML API enrichment: image=${!!mlImageUrl}, price=${mlPrice}, source=${mlData.source}`);
      } else {
        console.warn('[Autonomous Agent] ML API returned no data. Proceeding with defaults.');
      }
    } catch (mlErr: any) {
      console.warn('[Autonomous Agent] ML API fetch failed (non-fatal):', mlErr.message);
    }

    // 5. Generate the full review article via AI
    const prompt = buildPrompt({
      product: trendingProduct,
      category: targetCategory,
      price: mlPrice || undefined,
      old_price: mlPriceOld || undefined,
      affiliate_url: mlAffiliateUrl,
      image_url: mlImageUrl || undefined,
      tone: 'misto',
      site_name: 'Vetor Blog',
      site_url: 'https://vetor.blog',
      author: 'Agente de IA de Tráfego',
      existingCategories: allCategories,
    });

    const responseText = await generateText({
      prompt,
      responseJson: true,
      maxOutputTokens: 8192,
      temperature: 0.7,
    });
    if (!responseText) throw new Error('AI returned empty content');

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse JSON from AI response');

    const d = JSON.parse(jsonMatch[0]);

    // 5. Map AI response (snake_case) → ReviewData (camelCase) precisely
    const now = new Date().toISOString();
    const reviewId = crypto.randomUUID();

    const fullReview = {
      id: reviewId,
      slug: d.meta?.slug || d.slug || slugify(trendingProduct),
      status: 'published' as const,
      meta: {
        title: d.meta?.title || `Review ${trendingProduct}: Vale a Pena?`,
        description:
          d.meta?.description ||
          `Análise técnica completa do ${trendingProduct}.`,
        keywords: d.meta?.keywords || trendingProduct,
        readingTime: d.meta?.reading_time || d.meta?.readingTime || 8,
      },
      product: d.product || trendingProduct,
      category: d.category || targetCategory,
      marketplace: d.marketplace || 'Mercado Livre',
      priceOld: d.priceOld || d.old_price || '',
      priceNew: d.priceNew || d.price || '',
      affiliateUrl: mlAffiliateUrl,
      imageUrl:
        mlImageUrl ||
        d.imageUrl ||
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
      adsEnabled: false,
      hero: {
        headlineLine1:
          d.hero?.headline_line1 ||
          d.hero?.headlineLine1 ||
          trendingProduct.toUpperCase(),
        headlineLine2:
          d.hero?.headline_line2 ||
          d.hero?.headlineLine2 ||
          'VALE A PENA COMPRAR?',
        headlineEm:
          d.hero?.headline_em || d.hero?.headlineEm || trendingProduct,
        lead: d.hero?.lead || `Análise completa do ${trendingProduct}.`,
        overallScore:
          d.hero?.overall_score || d.hero?.overallScore || 8.5,
        bars:
          d.hero?.bars?.map((b: any) => ({
            label: b.label,
            value: b.value,
            pct: b.pct ?? b.value * 10,
          })) || [],
      },
      specs: d.specs || [],
      sections:
        d.sections?.map((s: any) => ({
          id: s.id,
          heading: s.heading,
          tocLabel: s.toc_label || s.tocLabel,
          tocEmoji: s.toc_emoji || s.tocEmoji,
          content: s.content,
        })) || [],
      compareTable: d.compare
        ? {
            caption: d.compare.caption || '',
            columns: d.compare.columns || [],
            winnerCol: d.compare.winner_col || d.compare.winnerCol || 1,
            rows: d.compare.rows || [],
          }
        : d.compareTable || {
            caption: '',
            columns: [],
            winnerCol: 1,
            rows: [],
          },
      pros: d.pros || [],
      cons: d.cons || [],
      testimonials: d.testimonials?.map((t: any) => ({
        name: t.name,
        city: t.city,
        state: t.state,
        monthYear: t.month_year || t.monthYear || '',
        text: t.text,
        stars: t.stars || 5,
      })) || [],
      faq: d.faq || [],
      verdict: {
        score: d.verdict?.score || 8.5,
        label: d.verdict?.label || 'BOM CUSTO-BENEFÍCIO',
        text:
          d.verdict?.text ||
          `O ${trendingProduct} é uma excelente compra.`,
        note:
          d.verdict?.note || 'Boa relação custo-benefício.',
      },
      schemaRating: {
        ratingValue:
          d.schemas?.aggregate_rating?.rating_value ||
          d.schemaRating?.ratingValue ||
          4.5,
        reviewCount:
          d.schemas?.aggregate_rating?.review_count ||
          d.schemaRating?.reviewCount ||
          100,
      },
      googleRank: 0,
      lastRankCheck: now,
      createdAt: now,
      updatedAt: now,
    };

    // 6. Save locally (for immediate visibility in case of warm Lambda)
    try {
      await createReview(fullReview);
      console.log(`[Autonomous Agent] Saved locally: ${trendingProduct} (${reviewId})`);
    } catch (localErr: any) {
      console.warn('[Autonomous Agent] Local save failed (non-fatal):', localErr.message);
    }

    // 7. Commit to GitHub → triggers Vercel redeploy with persistent data
    const gitResult = await commitNewReviewToGitHub(fullReview);
    if (gitResult.success) {
      console.log(`[Autonomous Agent] ✅ GitHub commit successful for "${trendingProduct}"`);
    } else {
      console.warn(`[Autonomous Agent] ⚠️ GitHub commit failed: ${gitResult.error}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Autonomous Agent] ✅ Completed in ${elapsed}s`);

    return NextResponse.json({
      success: true,
      category: targetCategory,
      product: trendingProduct,
      slug: fullReview.slug,
      githubPersisted: gitResult.success,
      elapsedSeconds: elapsed,
      message: `Artigo "${trendingProduct}" gerado e publicado autonomamente.`,
    });
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Autonomous Agent Error] (${elapsed}s):`, error);
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
