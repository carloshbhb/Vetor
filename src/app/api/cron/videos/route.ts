import { verifyCronAuth } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Keep the legacy cron path as a compatibility alias. All jobs now enter the
// same idempotent queue and carry a canonical review_url for the real renderer.
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET não configurado.' }, { status: 500 });
  }

  try {
    const target = new URL('/api/cron/video-queue-worker/', request.url);
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'queueFromReviews', limit: 1 }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ success: false, error: 'Resposta inválida do worker de fila.' }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao encaminhar a fila de vídeos.';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
