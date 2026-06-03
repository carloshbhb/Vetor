import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews, updateReview } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

function extractRankFromGrounding(rawResponse: any, targetDomain: string): { rank: number; debug: string } {
  try {
    const candidates = rawResponse?.candidates;
    if (!candidates?.length) return { rank: 0, debug: 'no candidates' };

    const candidate = candidates[0];
    const metadata = candidate?.groundingMetadata;
    if (!metadata) return { rank: 0, debug: 'no groundingMetadata' };

    const chunks = metadata.groundingChunks || metadata.search_entry_point?.rendered_content || [];
    if (Array.isArray(chunks) && chunks.length > 0) {
      for (let i = 0; i < chunks.length; i++) {
        const uri = chunks[i]?.web?.uri || chunks[i]?.uri || '';
        if (uri.includes(targetDomain)) {
          return { rank: i + 1, debug: `found at position ${i + 1}: ${uri}` };
        }
      }
      const urls = chunks.slice(0, 5).map((c: any) => c?.web?.uri || c?.uri || 'no-uri');
      return { rank: 0, debug: `not found in ${chunks.length} chunks. Top 5: ${JSON.stringify(urls)}` };
    }

    const supports = metadata.groundingSupports || [];
    if (Array.isArray(supports) && supports.length > 0) {
      for (let i = 0; i < supports.length; i++) {
        const segment = supports[i]?.segment?.text || '';
        if (segment.includes(targetDomain)) {
          return { rank: i + 1, debug: `found in support ${i + 1}` };
        }
      }
      return { rank: 0, debug: `not in ${supports.length} supports` };
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');

  const genAI = new GoogleGenerativeAI(apiKey);
  let groundedCount = 0;
  let failedCount = 0;
  const debugLog: string[] = [];

  for (const review of published) {
    let finalRank = 0;
    let debug = '';

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
      debug = `exception: ${err.message}`;
      failedCount++;
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
    total: published.length,
    message: `${groundedCount}/${published.length} rankings atualizados.`,
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
