import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';
import { getAllReviews } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { buildPrompt } from '@/lib/prompt';
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
      maxOutputTokens: 16384,
      temperature: 0.7,
    });
    if (!responseText) throw new Error('AI returned empty content');

    // Try to extract JSON from response, handling markdown code blocks and other artifacts
    let rawJson = '';
    const codeBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      rawJson = codeBlockMatch[1].trim();
    } else {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) rawJson = jsonMatch[0];
    }

    if (!rawJson) throw new Error('Could not parse JSON from AI response');

    // Aggressive JSON cleanup for free models
    rawJson = rawJson
      // Remove trailing commas before } or ]
      .replace(/,\s*([}\]])/g, '$1')
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Replace single quotes with double quotes (only for property values, not inside content)
      .replace(/:\s*'([^']*?)'/g, ': "$1"')
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    let d: any;
    try {
      d = JSON.parse(rawJson);
    } catch (parseErr) {
      console.warn('[Autonomous Agent] JSON parse failed. First 500 chars of raw:', rawJson.substring(0, 500));
      // Try more aggressive approach: find the outermost { } and parse
      const depthMatch = rawJson.match(/(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})/);
      if (depthMatch) {
        try {
          d = JSON.parse(depthMatch[1]);
        } catch {
          throw new Error(`Could not parse JSON from AI response: ${parseErr}`);
        }
      } else {
        throw new Error(`Could not parse JSON from AI response: ${parseErr}`);
      }
    }

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
        canonical: d.meta?.canonical || null,
        ogImage: d.meta?.og_image || d.meta?.ogImage || null,
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
    };

    // Fallback: if sections are empty, generate basic sections from hero content
    if (fullReview.sections.length === 0 && fullReview.hero.lead) {
      console.warn('[Autonomous Agent] AI returned empty sections. Generating fallback content.');
      fullReview.sections = [
        {
          id: 'sobre-o-produto',
          heading: `Sobre o ${trendingProduct}`,
          tocLabel: 'Sobre o Produto',
          tocEmoji: '📦',
          content: fullReview.hero.lead,
        },
        {
          id: 'analise',
          heading: `Análise do ${trendingProduct}`,
          tocLabel: 'Análise',
          tocEmoji: '🔍',
          content: `O ${trendingProduct} é uma excelente opção na categoria ${targetCategory}. Com design moderno e funcionalidades robustas, ele atende às necessidades do público brasileiro.`,
        },
      ];
    }

    // Ensure at least 4 sections for a complete review
    if (fullReview.sections.length < 4) {
      const missingSections = [
        { id: 'design', heading: 'Design e Construção', tocLabel: 'Design', tocEmoji: '🎨', content: `O ${trendingProduct} apresenta um design moderno e funcional. A construção é sólida com materiais de qualidade que garantem durabilidade no uso diário.` },
        { id: 'desempenho', heading: 'Desempenho e Recursos', tocLabel: 'Desempenho', tocEmoji: '⚡', content: `Em termos de desempenho, o ${trendingProduct} entrega resultados acima da média para sua categoria. Os recursos incluem conectividade avançada e interface intuitiva.` },
        { id: 'bateria', heading: 'Autonomia e Bateria', tocLabel: 'Bateria', tocEmoji: '🔋', content: `A autonomia do ${trendingProduct} é um dos seus pontos fortes. Ele oferece longas horas de uso contínuo, atendendo bem à rotina do usuário.` },
        { id: 'custo-beneficio', heading: 'Custo-Benefício', tocLabel: 'Custo-Benefício', tocEmoji: '💰', content: `Considerando sua proposta, o ${trendingProduct} oferece excelente custo-benefício. O investimento é justificado pela qualidade e recursos entregues.` },
      ];
      const existingIds = new Set(fullReview.sections.map((s: any) => s.id));
      for (const sec of missingSections) {
        if (fullReview.sections.length >= 6) break;
        if (!existingIds.has(sec.id)) {
          fullReview.sections.push(sec);
        }
      }
    }

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
