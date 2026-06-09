import { NextRequest, NextResponse } from 'next/server';
import { generateViralArticle } from '@/lib/generate-viral';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, products, type, affiliate_urls } = body;

    if (!category || !products || !Array.isArray(products) || products.length < 2) {
      return NextResponse.json(
        { error: 'Categoria e pelo menos 2 produtos são obrigatórios.' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';

    const result = await generateViralArticle({
      category,
      products,
      type: type || 'comparativo',
      affiliate_urls,
      site_name: 'Vetor Blog',
      site_url: siteUrl,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('[ViralArticle API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar artigo viral.' },
      { status: 500 }
    );
  }
}
