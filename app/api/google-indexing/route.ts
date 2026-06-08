// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Google Indexing API Endpoint
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/google-indexing — Indexa URL(s) no Google
// GET  /api/google-indexing — Retorna status da configuração

import { NextRequest, NextResponse } from 'next/server';
import { publishToGoogleIndexing, indexAllPages, indexNewReview } from '@/lib/google-indexing';

export const dynamic = 'force-dynamic';

async function checkCredentials(): Promise<boolean> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return true;
  }
  try {
    const fs = await import('fs');
    const path = await import('path');
    const keyPath = path.join(process.cwd(), 'credentials', 'google-key.json');
    return fs.existsSync(keyPath);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const hasCredentials = await checkCredentials();
  const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const siteUrl = _raw.startsWith('http') ? _raw : `https://${_raw}`;

  const url = new URL(request.url);
  const diagnose = url.searchParams.get('diagnose');

  if (diagnose === 'key') {
    const { createPrivateKey } = await import('crypto');
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!rawKey) return NextResponse.json({ error: 'No key' });

    let normalized = rawKey
      .replace(/\\n/g, '\n')
      .replace(/\\r\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    if (!normalized.includes('-----BEGIN')) {
      normalized = `-----BEGIN PRIVATE KEY-----\n${normalized}\n-----END PRIVATE KEY-----`;
    }

    const result: any = {
      rawLen: rawKey.length,
      hasLiteralBackslashN: rawKey.includes('\\n'),
      hasActualNewlines: rawKey.includes('\n'),
      normalizedLen: normalized.length,
      lineCount: normalized.split('\n').length,
      firstLine: normalized.split('\n')[0],
    };

    try {
      const keyObj = createPrivateKey({ key: normalized, format: 'pem' });
      result.importOk = true;
      result.keySize = (keyObj as any).size;
    } catch (e: any) {
      result.importOk = false;
      result.importError = e.message;

      // Try PKCS1
      try {
        const pkcs1 = normalized
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----')
          .replace('-----END PRIVATE KEY-----', '-----END RSA PRIVATE KEY-----');
        const keyObj = createPrivateKey({ key: pkcs1, format: 'pem' });
        result.pkcs1Ok = true;
      } catch (e2: any) {
        result.pkcs1Ok = false;
      }
    }

    return NextResponse.json(result);
  }

  return NextResponse.json({
    status: hasCredentials ? 'configured' : 'missing_credentials',
    hasCredentials,
    siteUrl,
    usage: {
      'POST /api/google-indexing': {
        description: 'Indexar URL(s) no Google',
        body: {
          url: 'URL específica para indexar (opcional)',
          slug: 'Slug do review para indexar (opcional)',
          action: 'all | url | review'
        }
      }
    }
  });
}

export async function POST(request: NextRequest) {
  const hasCredentials = await checkCredentials();

  if (!hasCredentials) {
    return NextResponse.json(
      {
        error: 'Google Indexing API não configurada',
        message: 'Configure GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY nas variáveis de ambiente',
        setup: {
          step1: 'Crie uma conta de serviço no Google Cloud Console',
          step2: 'Ative a Indexing API no projeto',
          step3: 'Adicione o email da conta como proprietário no Search Console',
          step4: 'Adicione as variáveis de ambiente no Vercel'
        }
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { url, slug, action = 'url' } = body;

    switch (action) {
      case 'all': {
        const result = await indexAllPages();
        return NextResponse.json({
          success: true,
          action: 'index_all',
          ...result
        });
      }

      case 'review': {
        if (!slug) {
          return NextResponse.json(
            { error: 'slug é obrigatório para action=review' },
            { status: 400 }
          );
        }
        const result = await indexNewReview(slug);
        return NextResponse.json({
          action: 'index_review',
          slug,
          ...result
        });
      }

      case 'url':
      default: {
        if (!url) {
          return NextResponse.json(
            { error: 'url é obrigatória para action=url' },
            { status: 400 }
          );
        }
        const result = await publishToGoogleIndexing(url);
        return NextResponse.json({
          action: 'index_url',
          url,
          ...result
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', message: String(error) },
      { status: 500 }
    );
  }
}
