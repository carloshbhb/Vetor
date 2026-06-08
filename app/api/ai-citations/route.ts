// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — AI Citations API
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ai-citations — Retorna estatísticas de citações em IA
// POST /api/ai-citations — Registra nova citação detectada

import { NextRequest, NextResponse } from 'next/server';
import { addCitation, getCitationStats, getRecentCitations } from '@/lib/ai-citations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getCitationStats();
    const recent = await getRecentCitations(5);

    return NextResponse.json({
      stats,
      recent,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas de citações' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.source || !body.query || !body.citedUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: source, query, citedUrl' },
        { status: 400 }
      );
    }

    const citation = addCitation({
      source: body.source,
      query: body.query,
      citedUrl: body.citedUrl,
      citedPage: body.citedPage || 'Desconhecido',
      context: body.context || '',
    });

    return NextResponse.json(citation, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Erro ao registrar citação' },
      { status: 500 }
    );
  }
}
