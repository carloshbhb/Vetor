import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, hasValidSession } from '@/lib/mercadolivre-auth';

/**
 * Test Mercado Livre API connection
 * GET /api/ml/test - Tests API access and returns results
 */
export async function GET(request: NextRequest) {
  if (!hasValidSession()) {
    return NextResponse.json({
      error: 'Not authenticated',
      message: 'Visit /api/ml/auth first to authorize',
    }, { status: 401 });
  }

  try {
    const token = await getValidAccessToken();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || 'iphone 15';
    const limit = searchParams.get('limit') || '3';

    const response = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=${limit}&attributes=id,title,price,category_id,permalink,thumbnail`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `ML API Error: ${response.status}`, details: error }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      query,
      total: data.paging?.total || 0,
      results: (data.results || []).map((item: {
        id: string;
        title: string;
        price: number;
        category_id: string;
        permalink: string;
        thumbnail: string;
      }) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        category: item.category_id,
        url: item.permalink,
        image: item.thumbnail?.replace('http:', 'https:'),
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test API',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
