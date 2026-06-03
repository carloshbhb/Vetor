import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews, updateReview } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

function extractRankFromGrounding(response: any, targetDomain: string): number {
  const candidates = response.response?.candidates;
  if (!candidates?.length) return 0;

  const candidate = candidates[0];
  const metadata = candidate?.groundingMetadata;
  if (!metadata) return 0;

  const chunks: GroundingChunk[] = metadata.groundingChunks || [];
  if (!chunks.length) return 0;

  for (let i = 0; i < chunks.length; i++) {
    const uri = chunks[i]?.web?.uri || '';
    if (uri.includes(targetDomain)) {
      return i + 1;
    }
  }

  return 0;
}

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

      const prompt = `Pesquise no Google Brasil: "${review.product}"`;
      const response = await model.generateContent(prompt);

      finalRank = extractRankFromGrounding(response, 'vetor.blog');

      if (finalRank > 0) {
        groundedCount++;
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
