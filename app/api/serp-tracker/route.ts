import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews, updateReview } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const MAX_PER_RUN = 5;
const DELAY_MS = 42000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractRankFromGrounding(rawResponse: any, targetDomain: string): { rank: number; debug: string } {
  try {
    const candidates = rawResponse?.candidates;
    if (!candidates?.length) return { rank: 0, debug: 'no candidates' };

    const candidate = candidates[0];
    const metadata = candidate?.groundingMetadata;
    if (!metadata) return { rank: 0, debug: 'no groundingMetadata' };

    const chunks = metadata.groundingChunks || [];
    if (Array.isArray(chunks) && chunks.length > 0) {
      for (let i = 0; i < chunks.length; i++) {
        const uri = chunks[i]?.web?.uri || '';
        if (uri.includes(targetDomain)) {
          return { rank: i + 1, debug: `found at pos ${i + 1}: ${uri}` };
        }
      }
      const urls = chunks.slice(0, 3).map((c: any) => c?.web?.uri || 'no-uri');
      return { rank: 0, debug: `${chunks.length} results, not found. Top: ${JSON.stringify(urls)}` };
    }

    return { rank: 0, debug: `metadata keys: ${Object.keys(metadata).join(',')}` };
  } catch (e: any) {
    return { rank: 0, debug: `error: ${e.message}` };
  }
}

async function trackSERPRanks() {
  const published = await getPublishedReviews();
  if (!published.length) {
    return { success: true, message: 'Nenhum review publicado.', groundedCount: 0, failedCount: 0, total: 0 };
  }

  const toCheck = [...published]
    .sort((a, b) => {
      const aTime = a.lastRankCheck ? new Date(a.lastRankCheck).getTime() : 0;
      const bTime = b.lastRankCheck ? new Date(b.lastRankCheck).getTime() : 0;
      return aTime - bTime;
    })
    .slice(0, MAX_PER_RUN);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');

  const genAI = new GoogleGenerativeAI(apiKey);
  let groundedCount = 0;
  let failedCount = 0;
  const debugLog: string[] = [];

  for (let i = 0; i < toCheck.length; i++) {
    const review = toCheck[i];
    let finalRank = 0;
    let debug = '';

    if (i > 0) {
      await sleep(DELAY_MS);
    }

    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: [{ googleSearch: {} }] as any,
      });

      const prompt = `Pesquise no Google Brasil: "${review.product}"`;
      const result = await model.generateContent(prompt);

      const rawResponse = (result as any).response?.candidates
        ? (result as any).response
        : result.response;

      const grounding = extractRankFromGrounding(rawResponse, 'vetor.blog');
      finalRank = grounding.rank;
      debug = grounding.debug;

      if (finalRank > 0) {
        groundedCount++;
      }
    } catch (err: any) {
      const is429 = err.message?.includes('429') || err.message?.includes('quota');
      debug = is429 ? '429 quota exceeded' : `exception: ${err.message?.substring(0, 100)}`;
      failedCount++;

      if (is429) {
        debugLog.push(`${review.product.substring(0, 30)}: 429 - stopping.`);
        break;
      }
    }

    debugLog.push(`${review.product.substring(0, 30)}: rank=${finalRank} | ${debug}`);

    await updateReview(review.id, {
      googleRank: finalRank,
      lastRankCheck: new Date().toISOString(),
    });
  }

  return {
    success: true,
    groundedCount,
    failedCount,
    checked: toCheck.length,
    total: published.length,
    message: `${groundedCount}/${toCheck.length} rankings atualizados. (${published.length - toCheck.length} restantes para amanhã)`,
    debug: debugLog,
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
