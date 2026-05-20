import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllReviews, createReview } from '@/lib/db';
import { buildPrompt } from '@/lib/prompt';

export const maxDuration = 60; // Allow up to 60 seconds (Vercel hobby limit is 10s, Pro is 300s, local power is infinite)

const DEFAULT_CATEGORIES = [
  'Wearables / Smartbands',
  'Acessórios para Games',
  'Fones de Ouvido',
  'Robôs Aspiradores',
  'Casa Inteligente'
];

export async function GET(req: NextRequest) {
  return handleAutonomousCycle();
}

export async function POST(req: NextRequest) {
  return handleAutonomousCycle();
}

async function handleAutonomousCycle() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const reviews = getAllReviews();

    // 1. Determine the niche/category to target
    let targetCategory = '';
    const existingCategories = Array.from(new Set(reviews.map(r => r.category).filter(Boolean)));
    
    if (existingCategories.length > 0) {
      // Pick one category at random from existing ones to stay relevant
      targetCategory = existingCategories[Math.floor(Math.random() * existingCategories.length)];
    } else {
      targetCategory = DEFAULT_CATEGORIES[Math.floor(Math.random() * DEFAULT_CATEGORIES.length)];
    }

    console.log(`[Autonomous Agent] Niche selected: ${targetCategory}`);

    // 2. Discover trending product using Google Search Grounding
    let trendingProduct = '';
    try {
      const searchModel = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        tools: [
          {
            googleSearchRetrieval: {}
          }
        ] as any
      });

      const trendPrompt = `Você é o Agente de Descoberta de Tráfego do vetor.blog. 
Pesquise na internet do Brasil em tempo real (2026) na categoria "${targetCategory}".
Identifique o produto que está tendo o maior crescimento de buscas ou interesse de compra nos últimos dias (um produto real, com nome exato, ex: "Sony WH-1000XM5" ou "Samsung Galaxy Fit 3").
Responda EXCLUSIVAMENTE com o nome exato desse produto, sem pontuação, sem aspas e sem explicações.`;

      const trendResponse = await searchModel.generateContent(trendPrompt);
      trendingProduct = trendResponse.response.text().trim().replace(/['"“”]/g, '');
    } catch (searchError) {
      console.warn('[Autonomous Agent] Search Grounding failed for trend discovery, using fallback list:', searchError);
      
      // Static fallback list of popular tech products
      const fallbackProducts: { [key: string]: string[] } = {
        'Wearables / Smartbands': ['Xiaomi Mi Band 9', 'Huawei Band 9', 'Samsung Galaxy Watch 7', 'Apple Watch SE 2024'],
        'Acessórios para Games': ['PlayStation DualSense Edge', 'Nintendo Switch Pro Controller', 'Teclado Mecânico Keychron K2'],
        'Fones de Ouvido': ['Sony WF-1000XM5', 'JBL Wave Flex', 'AirPods Pro 2', 'QCY T13'],
        'Robôs Aspiradores': ['Robô Aspirador Xiaomi S20', 'Robô Aspirador Kabum Smart 700', 'Robô Aspirador Eufy G10'],
        'Casa Inteligente': ['Amazon Echo Dot 5ª Geração', 'Lâmpada Inteligente Philips Hue', 'Fechadura Eletrônica Intelbras FR 101']
      };

      const options = fallbackProducts[targetCategory] || ['Xiaomi Mi Band 9', 'JBL Tune 520BT', 'Echo Dot 5'];
      trendingProduct = options[Math.floor(Math.random() * options.length)];
    }

    // Double check that we have a clean product name
    if (!trendingProduct || trendingProduct.length > 80 || trendingProduct.includes('\n')) {
      trendingProduct = 'Xiaomi Mi Band 9'; // Solid default fallback
    }

    console.log(`[Autonomous Agent] Trending product found: ${trendingProduct}`);

    // Check if we already have a review for this product to prevent duplicate spamming
    const exists = reviews.find(r => r.product.toLowerCase().includes(trendingProduct.toLowerCase()));
    if (exists) {
      console.log(`[Autonomous Agent] Review for ${trendingProduct} already exists. Skipping.`);
      return NextResponse.json({
        success: false,
        message: `Review para ${trendingProduct} já existe. Ignorado para evitar duplicados.`
      });
    }

    // 3. Generate high-quality review JSON using buildPrompt
    const generationModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = buildPrompt({
      product: trendingProduct,
      category: targetCategory,
      affiliate_url: `https://lista.mercadolivre.com.br/${encodeURIComponent(trendingProduct)}`,
      tone: 'misto',
      site_name: 'Vetor Blog',
      site_url: 'https://vetor.blog',
      author: 'Agente de IA de Tráfego',
      existingCategories
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
    if (!responseText) throw new Error('AI returned empty content for review');

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse JSON from AI response');

    const reviewJson = JSON.parse(jsonMatch[0]);

    // Format fields to match ReviewData precisely before saving
    const newReview = {
      slug: reviewJson.slug || slugify(trendingProduct),
      status: 'published' as const, // Auto published as per Option B
      meta: {
        title: reviewJson.meta?.title || `Review ${trendingProduct}: Vale a Pena?`,
        description: reviewJson.meta?.description || `Analise técnica completa do ${trendingProduct}.`,
        keywords: reviewJson.meta?.keywords || trendingProduct,
        readingTime: reviewJson.meta?.readingTime || 8
      },
      product: trendingProduct,
      category: targetCategory,
      marketplace: reviewJson.marketplace || 'Mercado Livre',
      priceOld: reviewJson.priceOld || '',
      priceNew: reviewJson.priceNew || '',
      affiliateUrl: `https://lista.mercadolivre.com.br/${encodeURIComponent(trendingProduct)}`,
      imageUrl: reviewJson.imageUrl || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
      adsEnabled: false,
      hero: {
        headlineLine1: reviewJson.hero?.headlineLine1 || trendingProduct.toUpperCase(),
        headlineLine2: reviewJson.hero?.headlineLine2 || 'VALE A PENA COMPRAR?',
        headlineEm: reviewJson.hero?.headlineEm || trendingProduct,
        lead: reviewJson.hero?.lead || `Análise completa do ${trendingProduct}.`,
        overallScore: reviewJson.hero?.overallScore || 8.5,
        bars: reviewJson.hero?.bars || []
      },
      specs: reviewJson.specs || [],
      sections: reviewJson.sections || [],
      compareTable: reviewJson.compareTable || { caption: '', columns: [], winnerCol: 1, rows: [] },
      pros: reviewJson.pros || [],
      cons: reviewJson.cons || [],
      testimonials: [],
      faq: reviewJson.faq || [],
      verdict: {
        score: reviewJson.verdict?.score || 8.5,
        label: reviewJson.verdict?.label || 'BOM CUSTO-BENEFÍCIO',
        text: reviewJson.verdict?.text || `O ${trendingProduct} é uma excelente compra.`,
        note: reviewJson.verdict?.note || 'Boa relação custo-benefício.'
      },
      schemaRating: {
        ratingValue: reviewJson.schemaRating?.ratingValue || 4.5,
        reviewCount: reviewJson.schemaRating?.reviewCount || 100
      },
      googleRank: 1, // Set initial organic position
      lastRankCheck: new Date().toISOString()
    };

    // Save directly to the database
    const newId = createReview(newReview);

    console.log(`[Autonomous Agent] Published review for ${trendingProduct} with ID ${newId}`);

    return NextResponse.json({
      success: true,
      category: targetCategory,
      product: trendingProduct,
      slug: newReview.slug,
      message: `Artigo para ${trendingProduct} gerado e publicado autonomamente.`
    });
  } catch (error: any) {
    console.error('[Autonomous Agent Error]:', error);
    return NextResponse.json({ error: 'Erro no agente autônomo: ' + error.message }, { status: 500 });
  }
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
