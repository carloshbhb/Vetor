import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, hasValidSession } from '@/lib/mercadolivre-auth';

/**
 * Test Mercado Livre API connection
 * GET /api/ml/test - Tests API access and returns results
 *
 * Uses /products/search: the legacy /sites/MLB/search endpoint now answers 403
 * even with a valid token. Note the Product API exposes no price field, so this
 * endpoint reports id/title/category/url/image only.
 */
export async function GET(request: NextRequest) {
  if (!(await hasValidSession())) {
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
      `https://api.mercadolibre.com/products/search?q=${encodeURIComponent(query)}&site_id=MLB&status=active&limit=${limit}`,
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
      endpoint: '/products/search',
      total: data.paging?.total || 0,
      results: (data.results || []).map((item: {
        id: string;
        name?: string;
        domain_id?: string;
        pictures?: Array<{ secure_url?: string; url?: string }>;
      }) => ({
        id: item.id,
        title: item.name || '',
        category: item.domain_id || '',
        url: `https://www.mercadolivre.com.br/p/${item.id}`,
        image: item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url || null,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test API',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
