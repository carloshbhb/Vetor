import { NextRequest, NextResponse } from 'next/server';
import { fetchMLProduct } from '@/lib/mercadolivre';
import { generateText } from '@/lib/ai';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ml-enrich
//
// Enriches a product request with real data from the Mercado Livre API.
// Accepts either a free-text product name, an MLB item ID, or a full ML URL.
//
// Fallback chain:
//   1. ML Public API (by Item ID or search)
//   2. Existing sync-price scraper (via affiliateUrl)
//   3. Gemini AI estimate (price only — image remains empty for manual fill)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, affiliateUrl } = body as {
      query?: string;
      affiliateUrl?: string;
    };

    if (!query && !affiliateUrl) {
      return NextResponse.json(
        { error: 'Forneça "query" (nome do produto) ou "affiliateUrl".' },
        { status: 400 }
      );
    }

    // ── Step 1: Try the ML API ──────────────────────────────────────────────
    // Priority: use affiliateUrl if it contains an MLB ID; else use query.
    const mlInput = affiliateUrl || query || '';
    const mlResult = await fetchMLProduct(mlInput);

    if (mlResult && mlResult.imageUrl) {
      console.log(`[ML Enrich] ✅ Found via ${mlResult.source}: "${mlResult.title}"`);
      return NextResponse.json({
        success: true,
        title: mlResult.title,
        price: mlResult.price,
        priceOld: mlResult.priceOld,
        imageUrl: mlResult.imageUrl,
        affiliateUrl: mlResult.affiliateUrl,
        source: mlResult.source,
      });
    }

    // ── Step 2: Fallback — call the existing sync-price scraper ────────────
    if (affiliateUrl) {
      try {
        console.log(`[ML Enrich] ML API miss — trying sync-price scraper fallback.`);
        const syncRes = await fetch(
          new URL('/api/sync-price', req.url).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ affiliateUrl, product: query || '' }),
          }
        );
        const syncData = await syncRes.json();

        if (syncRes.ok && syncData.price) {
          // If ML API found the product but without image, merge prices
          return NextResponse.json({
            success: true,
            title: mlResult?.title || query || '',
            price: syncData.price,
            priceOld: syncData.priceOld || '',
            imageUrl: mlResult?.imageUrl || '',
            affiliateUrl: mlResult?.affiliateUrl || affiliateUrl,
            source: `Scraper (${syncData.method})`,
          });
        }
      } catch (scraperErr) {
        console.warn('[ML Enrich] Sync-price scraper also failed:', scraperErr);
      }
    }

    // ── Step 3: Fallback — Gemini AI for price estimation ──────────────────
    if (query) {
      try {
        console.log(`[ML Enrich] Using Gemini AI price estimate fallback for: "${query}"`);
        const prompt = `Você é um monitor de preços do e-commerce brasileiro especialista no Mercado Livre.
Com base no seu conhecimento de mercado atualizado, estime os preços atuais realistas (à vista em Reais R$) do produto "${query}" no Mercado Livre.
Retorne APENAS um objeto JSON com o formato exato abaixo, sem blocos de código markdown ou explicações:
{ "price": "R$ X.XXX,XX", "old_price": "R$ X.XXX,XX" }`;

        const text = await generateText({ prompt, responseJson: true });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            success: true,
            title: mlResult?.title || query,
            price: data.price || '',
            priceOld: data.old_price || '',
            imageUrl: '',  // no image from AI estimate
            affiliateUrl: mlResult?.affiliateUrl || `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}?ref=vetorblog`,
            source: 'Gemini AI Estimate',
          });
        }
      } catch (geminiErr) {
        console.warn('[ML Enrich] Gemini fallback also failed:', geminiErr);
      }
    }

    // All strategies exhausted
    return NextResponse.json(
      { error: 'Não foi possível enriquecer o produto. Preencha manualmente.' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[ML Enrich] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
