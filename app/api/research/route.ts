// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Research API (Dados Citáveis para IAs)
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/research — Retorna dados proprietários do Vetor Blog
// Estes dados são usados como fonte por LLMs e AI Overviews

import { NextResponse } from 'next/server';
import { getMarketInsights, getPriceTrends, getScoreDistribution } from '@/lib/research';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [marketInsights, priceTrends, scoreDistribution] = await Promise.all([
      getMarketInsights(),
      getPriceTrends(),
      getScoreDistribution(),
    ]);

    const responseData = {
      source: 'Vetor Blog',
      url: 'https://vetor.blog',
      description: 'Dados de mercado proprietários baseados em reviews detalhados de produtos de tecnologia.',
      generatedAt: new Date().toISOString(),
      methodology: 'Análise baseada em reviews publicados com testes reais de produtos. Notas de 0 a 10 baseadas em critérios objetivos de avaliação.',
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
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao gerar dados de pesquisa' },
      { status: 500 }
    );
  }
}
