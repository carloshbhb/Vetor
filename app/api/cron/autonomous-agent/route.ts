import { NextRequest, NextResponse } from 'next/server';
import { generateText, generateTextWithModel, getFreeModels } from '@/lib/ai';
import { getAllReviews } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { fetchMLProduct, buildAffiliateUrl } from '@/lib/mercadolivre';
import { createClient } from '@supabase/supabase-js';

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

    // 5. Generate the review in multiple steps using different models per section
    const freeModels = getFreeModels();
    let modelIdx = 0;
    const nextModel = () => freeModels[modelIdx++ % freeModels.length].id;

    // Helper: parse JSON from AI response
    const parseJsonResponse = (text: string): any => {
      let raw = '';
      const codeBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlock) raw = codeBlock[1].trim();
      else {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) raw = m[0];
      }
      if (!raw) return null;
      raw = raw.replace(/,\s*([}\]])/g, '$1').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      try { return JSON.parse(raw); } catch { return null; }
    };

    // Step 5a: Generate meta, hero, specs
    const metaPrompt = `Gere um JSON para review do produto "${trendingProduct}" na categoria "${targetCategory}".
Preço: ${mlPrice || 'não informado'}. Preço antigo: ${mlPriceOld || 'não informado'}.
Retorne APENAS JSON válido com esta estrutura exata:
{
  "meta": {"title": "string (até 60 chars com nome e ano)", "description": "string (150-160 chars)", "keywords": "string (5-8 tags)", "slug": "string", "reading_time": 8},
  "product": "${trendingProduct}",
  "category": "${targetCategory}",
  "priceOld": "${mlPriceOld || ''}",
  "priceNew": "${mlPrice || ''}",
  "hero": {"headline_line1": "string (até 25 chars)", "headline_line2": "string (até 35 chars)", "headline_em": "string", "lead": "string (3 frases persuasivas)", "overall_score": 8.5, "bars": [{"label": "string", "value": 9.0, "pct": 90}]},
  "specs": [{"label": "string", "value": "string", "highlight": true}]
}
Bars: 5 atributos. Specs: mínimo 6. Tudo em português BR.`;

    console.log(`[Autonomous Agent] Step 5a: Generating meta/hero/specs with ${nextModel()}...`);
    const metaText = await generateText({ prompt: metaPrompt, responseJson: true, maxOutputTokens: 4096 });
    const metaData = parseJsonResponse(metaText);
    if (!metaData) throw new Error('Failed to parse meta/hero/specs JSON');

    // Step 5b: Generate sections individually with different models
    const sectionPrompts = [
      { id: 'design', heading: 'Design e Construção', tocLabel: 'Design', tocEmoji: '🎨',
        prompt: `Escreva uma seção de review (300-500 palavras) sobre DESIGN E CONSTRUÇÃO do produto "${trendingProduct}" (${targetCategory}). Use Markdown com negrito, listas bullets e subtópicos H3. Tom persuasivo e informativo em PT-BR. Foque em materiais, acabamento, ergonomia e transportabilidade.` },
      { id: 'qualidade', heading: 'Qualidade e Desempenho', tocLabel: 'Qualidade', tocEmoji: '⚡',
        prompt: `Escreva uma seção de review (300-500 palavras) sobre QUALIDADE E DESEMPENHO do produto "${trendingProduct}" (${targetCategory}). Use Markdown com negrito, listas bullets e subtópicos H3. Tom persuasivo em PT-BR. Foque em performance, recursos, velocidade e experiência de uso real.` },
      { id: 'bateria', heading: 'Autonomia e Bateria', tocLabel: 'Bateria', tocEmoji: '🔋',
        prompt: `Escreva uma seção de review (300-500 palavras) sobre AUTONOMIA E BATERIA do produto "${trendingProduct}" (${targetCategory}). Use Markdown com negrito, listas bullets e subtópicos H3. Tom persuasivo em PT-BR. Foque em duração real, tempo de carga e comparativo com concorrentes.` },
      { id: 'custo-beneficio', heading: 'Custo-Benefício', tocLabel: 'Custo-Benefício', tocEmoji: '💰',
        prompt: `Escreva uma seção de review (300-500 palavras) sobre CUSTO-BENEFÍCIO do produto "${trendingProduct}" (${targetCategory}). Preço atual: ${mlPrice || 'não informado'}. Use Markdown com negrito, listas bullets e subtópicos H3. Tom persuasivo em PT-BR. Compare com concorrentes e justifique o investimento.` },
    ];

    const sections: any[] = [];
    for (const sec of sectionPrompts) {
      const model = nextModel();
      console.log(`[Autonomous Agent] Step 5b: Generating section "${sec.heading}" with ${model}...`);
      try {
        const content = await generateTextWithModel(sec.prompt, model, { maxOutputTokens: 2048 });
        sections.push({ id: sec.id, heading: sec.heading, tocLabel: sec.tocLabel, tocEmoji: sec.tocEmoji, content });
      } catch (err: any) {
        console.warn(`[Autonomous Agent] Section "${sec.heading}" failed: ${err.message}. Using fallback.`);
        sections.push({ id: sec.id, heading: sec.heading, tocLabel: sec.tocLabel, tocEmoji: sec.tocEmoji,
          content: `**${sec.heading}**\n\nO ${trendingProduct} impressiona neste aspecto. Sua construção é sólida e os materiais utilizados transmitem qualidade desde o primeiro contato. No uso diário, ele entrega consistentemente o que promete, atendendo às expectativas do público brasileiro.` });
      }
    }

    // Step 5c: Generate pros, cons, verdict, FAQ
    const verdictPrompt = `Gere um JSON para review do "${trendingProduct}" (${targetCategory}).
Retorne APENAS JSON válido:
{
  "pros": ["string (mínimo 5 prós)"],
  "cons": ["string (mínimo 4 contras)"],
  "verdict": {"score": 8.5, "label": "string (ex: EXCELENTE CUSTO-BENEFÍCIO)", "text": "string (3 frases persuasivas)", "note": "string (público-alvo)"},
  "faq": [{"question": "string", "answer": "string"}],
  "schemas": {"aggregate_rating": {"rating_value": 8.5, "review_count": 100}}
}
Seja honesto nos contras (aumenta confiança). Mínimo 5 FAQ. PT-BR.`;

    const verdictModel = nextModel();
    console.log(`[Autonomous Agent] Step 5c: Generating pros/cons/verdict with ${verdictModel}...`);
    const verdictText = await generateTextWithModel(verdictPrompt, verdictModel, { responseJson: true, maxOutputTokens: 2046 });
    const verdictData = parseJsonResponse(verdictText) || { pros: [], cons: [], verdict: { score: 8.5, label: 'BOM CUSTO-BENEFÍCIO', text: '', note: '' }, faq: [] };

    // Build full review object from all generated parts
    const now = new Date().toISOString();
    const reviewId = crypto.randomUUID();

    const fullReview = {
      id: reviewId,
      slug: metaData.meta?.slug || slugify(trendingProduct),
      status: 'published' as const,
      meta: {
        title: metaData.meta?.title || `Review ${trendingProduct}: Vale a Pena?`,
        description: metaData.meta?.description || `Análise completa do ${trendingProduct}.`,
        keywords: metaData.meta?.keywords || trendingProduct,
        readingTime: metaData.meta?.reading_time || 8,
        canonical: metaData.meta?.canonical || null,
        ogImage: metaData.meta?.og_image || null,
      },
      product: metaData.product || trendingProduct,
      category: metaData.category || targetCategory,
      marketplace: metaData.marketplace || 'Mercado Livre',
      priceOld: metaData.priceOld || '',
      priceNew: metaData.priceNew || '',
      affiliateUrl: mlAffiliateUrl,
      imageUrl: mlImageUrl || metaData.imageUrl || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
      adsEnabled: false,
      hero: {
        headlineLine1: metaData.hero?.headline_line1 || trendingProduct.toUpperCase(),
        headlineLine2: metaData.hero?.headline_line2 || 'VALE A PENA COMPRAR?',
        headlineEm: metaData.hero?.headline_em || trendingProduct,
        lead: metaData.hero?.lead || `Análise completa do ${trendingProduct}.`,
        overallScore: metaData.hero?.overall_score || 8.5,
        bars: metaData.hero?.bars?.map((b: any) => ({ label: b.label, value: b.value, pct: b.pct ?? b.value * 10 })) || [],
      },
      specs: metaData.specs || [],
      sections,
      compareTable: { caption: '', columns: [], winnerCol: 1, rows: [] },
      pros: verdictData.pros || [],
      cons: verdictData.cons || [],
      testimonials: [],
      faq: verdictData.faq || [],
      verdict: {
        score: verdictData.verdict?.score || 8.5,
        label: verdictData.verdict?.label || 'BOM CUSTO-BENEFÍCIO',
        text: verdictData.verdict?.text || `O ${trendingProduct} é uma excelente compra.`,
        note: verdictData.verdict?.note || 'Boa relação custo-benefício.',
      },
      schemaRating: {
        ratingValue: verdictData.schemas?.aggregate_rating?.rating_value || 8.5,
        reviewCount: verdictData.schemas?.aggregate_rating?.review_count || 100,
      },
      googleRank: 0,
      lastRankCheck: now,
      createdAt: now,
      updatedAt: now,
    };

    // 6. Save to Supabase directly (bypasses file fallback)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase env vars not configured. Cannot save review.');
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const insertData = {
      slug: fullReview.slug,
      status: fullReview.status,
      product: fullReview.product,
      category: fullReview.category,
      marketplace: fullReview.marketplace,
      price_old: fullReview.priceOld,
      price_new: fullReview.priceNew,
      affiliate_url: fullReview.affiliateUrl,
      image_url: fullReview.imageUrl,
      ads_enabled: fullReview.adsEnabled,
      meta_title: fullReview.meta.title,
      meta_description: fullReview.meta.description,
      meta_keywords: fullReview.meta.keywords,
      meta_reading_time: fullReview.meta.readingTime,
      meta_canonical: fullReview.meta.canonical,
      meta_og_image: fullReview.meta.ogImage,
      hero_headline_line1: fullReview.hero.headlineLine1,
      hero_headline_line2: fullReview.hero.headlineLine2,
      hero_headline_em: fullReview.hero.headlineEm,
      hero_lead: fullReview.hero.lead,
      hero_overall_score: fullReview.hero.overallScore,
      hero_bars: fullReview.hero.bars,
      specs: fullReview.specs,
      sections: fullReview.sections,
      compare_table: fullReview.compareTable,
      pros: fullReview.pros,
      cons: fullReview.cons,
      testimonials: fullReview.testimonials,
      verdict_score: fullReview.verdict.score,
      verdict_label: fullReview.verdict.label,
      verdict_text: fullReview.verdict.text,
      verdict_note: fullReview.verdict.note,
      schema_rating_value: fullReview.schemaRating.ratingValue,
      schema_review_count: fullReview.schemaRating.reviewCount,
      google_rank: fullReview.googleRank,
      last_rank_check: fullReview.lastRankCheck,
    };

    const { error: insertError } = await supabase
      .from('reviews')
      .insert(insertData);

    if (insertError) {
      console.error('[Autonomous Agent] Supabase insert failed:', insertError);
      throw new Error(`Supabase insert failed: ${insertError.message}`);
    }
    console.log(`[Autonomous Agent] Saved to Supabase: ${trendingProduct} (${reviewId})`);

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
