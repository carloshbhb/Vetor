import { NextRequest, NextResponse } from 'next/server';
import { restoreLegacyReviews } from '@/lib/restore-legacy';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

// GET /api/cron/restore-legacy?token=CRON_SECRET[&limit=20]
// Vigia o Supabase antigo: enquanto bloqueado, responde no-op barato.
// Quando desbloquear, importa os reviews faltantes (diff por slug, lotes
// pequenos) para o banco novo + commita no data/reviews.json do GitHub.
// Agendado 1x/dia no vercel.json. Idempotente.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || req.nextUrl.searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get('limit') || 20), 1),
    50
  );

  try {
    const result = await restoreLegacyReviews(limit);
    return NextResponse.json(
      {
        db: (process.env.NEXT_PUBLIC_SUPABASE_URL || 'none').slice(-6),
        success: result.ok,
        ...result,
      },
      { headers: NO_STORE }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
