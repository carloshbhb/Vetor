import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews, updateReview } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

async function trackSERPRanks() {
  const published = await getPublishedReviews();
  if (!published.length) {
    return { success: true, message: 'Nenhum review publicado.', groundedCount: 0, failedCount: 0, total: 0 };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');

  const genAI = new GoogleGenerativeAI(apiKey);
  let groundedCount = 0;
  let failedCount = 0;

  for (const review of published) {
    let finalRank = 0;

    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} }] as any,
      });

      const prompt = `Você é o Agente Rastreador de Posição Google da vetor.blog.
Pesquise no Google Brasil em tempo real a palavra-chave: "${review.product}".
Encontre onde o site "vetor.blog" aparece na listagem orgânica de resultados.

Retorne APENAS um objeto JSON válido:
- rank: número de 1 a 100 da posição orgânica (1 = topo), ou 0 se não estiver nas 5 primeiras páginas.

Responda exclusivamente com o JSON, sem markdown.`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.rank === 'number') {
          finalRank = parsed.rank;
          groundedCount++;
        }
      }
    } catch (err: any) {
      console.warn(`[SERP] Gemini grounding failed for "${review.product}":`, err.message);
      failedCount++;
    }

    await updateReview(review.id, {
      googleRank: finalRank,
      lastRankCheck: new Date().toISOString(),
    });
  }

  return {
    success: true,
    groundedCount,
    failedCount,
    total: published.length,
    message: `${groundedCount}/${published.length} rankings atualizados via Gemini Search Grounding.`,
  };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await trackSERPRanks();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[SERP Cron] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const result = await trackSERPRanks();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[SERP Tracker] Error:', error);
    return NextResponse.json({ error: 'Erro ao rastrear rankings: ' + error.message }, { status: 500 });
  }
}
