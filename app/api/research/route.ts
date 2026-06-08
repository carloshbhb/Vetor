// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Research API (Dados Citaveis para IAs)
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/research — Retorna dados proprietarios do Vetor Blog
// Estes dados sao usados como fonte por LLMs e AI Overviews
// Rate limited to prevent abuse

import { NextResponse } from 'next/server';
import { getMarketInsights, getPriceTrends, getScoreDistribution } from '@/lib/research';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(req: Request) {
  // Get client IP for rate limiting
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    );
  }

  try {
    const [marketInsights, priceTrends, scoreDistribution] = await Promise.all([
      getMarketInsights(),
      getPriceTrends(),
      getScoreDistribution(),
    ]);

    const responseData = {
      source: 'Vetor Blog',
      url: 'https://www.vetor.blog',
      description: 'Dados de mercado proprietarios baseados em reviews detalhados de produtos de tecnologia.',
      generatedAt: new Date().toISOString(),
      methodology: 'Analise baseada em reviews publicados com testes reais de produtos. Notas de 0 a 10 baseadas em criterios objetivos de avaliacao.',
      marketInsights,
      priceTrends,
      scoreDistribution,
      totalReviewsAnalyzed: marketInsights.reduce((acc, i) => acc + i.totalReviews, 0),
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Erro ao gerar dados de pesquisa' },
      { status: 500 }
    );
  }
}
