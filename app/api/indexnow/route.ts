import { NextRequest, NextResponse } from 'next/server';
import { submitUrl, submitUrls } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasKey = process.env.INDEXNOW_KEY;
  return NextResponse.json({
    status: hasKey ? 'configured' : 'missing_credentials',
    hasCredentials: !!hasKey,
    keyLocation: process.env.INDEXNOW_KEY_LOCATION || '',
    usage: {
      'POST /api/indexnow': {
        description: 'Envia URL(s) para indexação no Bing via IndexNow',
        body: { urls: ['string'] }
      },
      'GET /api/indexnow': 'Retorna status da configuração',
    }
  });
}

export async function POST(request: NextRequest) {
  const hasKey = process.env.INDEXNOW_KEY;
  if (!hasKey) {
    return NextResponse.json(
      { error: 'IndexNow key não configurada' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'urls é obrigatório e deve ser um array' },
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
