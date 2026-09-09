import { NextRequest, NextResponse } from 'next/server';
import { submitUrls } from '@/lib/indexnow';
import { INDEXNOW_KEY, INDEXNOW_KEY_LOCATION, NEXT_PUBLIC_SITE_URL } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasKey = !!INDEXNOW_KEY;
  return NextResponse.json({
    status: hasKey ? 'configured' : 'missing_credentials',
    hasCredentials: hasKey,
    keyLocation: INDEXNOW_KEY_LOCATION,
    usage: {
      'POST /api/indexnow': {
        description: 'Envia URL(s) para indexação no Bing via IndexNow',
        body: { urls: ['string'], action: 'all | custom' }
      },
      'GET /api/indexnow': 'Retorna status da configuração',
    }
  });
}

export async function POST(request: NextRequest) {
  if (!INDEXNOW_KEY) {
    return NextResponse.json(
      { error: 'IndexNow key não configurada' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    let { urls, action } = body;

    const baseUrl = NEXT_PUBLIC_SITE_URL.startsWith('http')
      ? NEXT_PUBLIC_SITE_URL
      : `https://${NEXT_PUBLIC_SITE_URL}`;

    if (action === 'all') {
      const { getPublishedReviewCards } = await import('@/lib/db');
      const reviews = await getPublishedReviewCards().catch(() => []);
      const staticPaths = ['/', '/research', '/sobre', '/privacidade', '/termos'];
      const categories = Array.from(new Set(reviews.map(r => r.category || 'Geral')));

      urls = [
        ...staticPaths.map(p => `${baseUrl}${p}`),
        ...categories.map(c => `${baseUrl}/categoria/${c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`),
        ...reviews.map(r => `${baseUrl}/review/${r.slug}`),
      ];
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'urls é obrigatório (ou utilize { action: "all" })' },
        { status: 400 }
      );
    }

    const result = await submitUrls(urls);
    return NextResponse.json({
      success: true,
      indexed: result.success,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao enviar para IndexNow', message: error?.message },
      { status: 500 }
    );
  }
}
