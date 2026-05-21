import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllReviews, createReview } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { buildPrompt } from '@/lib/prompt';

export const maxDuration = 60;

const DEFAULT_CATEGORIES = [
  'Wearables / Smartbands',
  'Acessórios para Games',
  'Fones de Ouvido',
  'Robôs Aspiradores',
  'Casa Inteligente',
  'Notebooks',
  'Tablets',
  'Câmeras de Segurança',
];

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
  return handleAutonomousCycle();
}

async function handleAutonomousCycle() {
  const startTime = Date.now();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const reviews = getAllReviews();

    // 1. Determine the niche/category to target
    const existingCategories = Array.from(
      new Set(reviews.map((r) => r.category).filter(Boolean))
    );
    let targetCategory =
      existingCategories.length > 0
        ? existingCategories[Math.floor(Math.random() * existingCategories.length)]
        : DEFAULT_CATEGORIES[Math.floor(Math.random() * DEFAULT_CATEGORIES.length)];

    console.log(`[Autonomous Agent] Niche selected: ${targetCategory}`);

    // 2. Discover trending product
    let trendingProduct = '';
    try {
      const searchModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        tools: [{ googleSearchRetrieval: {} }] as any,
      });

      const trendPrompt = `Você é o Agente de Descoberta de Tráfego do vetor.blog.
Pesquise na internet do Brasil em tempo real (${new Date().getFullYear()}) na categoria "${targetCategory}".
Identifique o produto que está tendo o maior crescimento de buscas ou interesse de compra nos últimos dias (um produto real, com nome exato, ex: "Sony WH-1000XM5" ou "Samsung Galaxy Fit 3").
Responda EXCLUSIVAMENTE com o nome exato desse produto, sem pontuação, sem aspas e sem explicações.`;

      const trendResponse = await searchModel.generateContent(trendPrompt);
      trendingProduct = trendResponse.response
        .text()
        .trim()
        .replace(/['\"""]/g, '');
    } catch (searchError: any) {
      console.warn(
        '[Autonomous Agent] Search Grounding failed, using fallback list:',
        searchError?.message || searchError
      );

      // Static fallback list of popular tech products
      const fallbackProducts: { [key: string]: string[] } = {
        'Wearables / Smartbands': [
          'Xiaomi Mi Band 9',
          'Huawei Band 9',
          'Samsung Galaxy Watch 7',
          'Apple Watch SE 2024',
        ],
        'Acessórios para Games': [
          'PlayStation DualSense Edge',
          'Nintendo Switch Pro Controller',
          'Teclado Mecânico Keychron K2',
        ],
        'Fones de Ouvido': [
          'Sony WF-1000XM5',
          'JBL Wave Flex',
          'AirPods Pro 2',
          'QCY T13',
        ],
        'Robôs Aspiradores': [
          'Robô Aspirador Xiaomi S20',
          'Robô Aspirador Kabum Smart 700',
          'Robô Aspirador Eufy G10',
        ],
        'Casa Inteligente': [
          'Amazon Echo Dot 5ª Geração',
          'Lâmpada Inteligente Philips Hue',
          'Fechadura Eletrônica Intelbras FR 101',
        ],
        'Notebooks': [
          'Acer Nitro V 15',
          'Lenovo IdeaPad 3i',
          'Samsung Galaxy Book 4',
        ],
        'Tablets': [
          'Samsung Galaxy Tab S9 FE',
          'iPad 10ª Geração',
          'Xiaomi Pad 6',
        ],
        'Câmeras de Segurança': [
          'Intelbras iM3',
          'TP-Link Tapo C200',
          'Xiaomi Mi Camera 2K',
        ],
      };

      const options = fallbackProducts[targetCategory] || [
        'Xiaomi Mi Band 9',
        'JBL Tune 520BT',
        'Echo Dot 5',
      ];
      trendingProduct = options[Math.floor(Math.random() * options.length)];
    }

    // Sanitize product name
    if (
      !trendingProduct ||
      trendingProduct.length > 80 ||
      trendingProduct.includes('\n')
    ) {
      trendingProduct = 'Xiaomi Mi Band 9';
    }

    console.log(`[Autonomous Agent] Trending product found: ${trendingProduct}`);

    // 3. Check for duplicates
    const exists = reviews.find(
      (r) =>
        r.product.toLowerCase().includes(trendingProduct.toLowerCase()) ||
        r.slug === slugify(trendingProduct)
    );
    if (exists) {
      console.log(
        `[Autonomous Agent] Review for "${trendingProduct}" already exists. Skipping.`
      );
      return NextResponse.json({
        success: false,
        message: `Review para "${trendingProduct}" já existe. Ignorado.`,
      });
    }

    // 4. Generate the full review article via AI
    const generationModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
    const prompt = buildPrompt({
      product: trendingProduct,
      category: targetCategory,
      affiliate_url: `https://lista.mercadolivre.com.br/${encodeURIComponent(trendingProduct)}`,
      tone: 'misto',
      site_name: 'Vetor Blog',
      site_url: 'https://vetor.blog',
      author: 'Agente de IA de Tráfego',
      existingCategories,
    });

    const result = await generationModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });

    const responseText = result.response.text();
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
      affiliateUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(trendingProduct)}`,
      imageUrl:
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
      createReview(fullReview);
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
