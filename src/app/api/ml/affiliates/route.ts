import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/mercadolivre-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * GET /api/ml/affiliates - List affiliate links
 * POST /api/ml/affiliates - Add new affiliate link
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'active';
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabase
    .from('ml_affiliate_links')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('product_category', category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ links: data, count: data.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productUrl, trackingUrl, shortUrl, campaign } = body;

    if (!productUrl || !trackingUrl) {
      return NextResponse.json(
        { error: 'productUrl and trackingUrl are required' },
        { status: 400 }
      );
    }

    // Extract product ID from URL
    const productIdMatch = productUrl.match(/MLB-?\d+/i) || productUrl.match(/\/p\/MLB/i);
    const productId = productIdMatch ? productIdMatch[0].replace(/-/g, '').replace('/p/', '') : null;

    // Try to get product details from ML API
    let productTitle = '';
    let productCategory = '';
    let productPrice = 0;

    if (productId) {
      try {
        const token = await getValidAccessToken();
        const response = await fetch(
          `https://api.mercadolibre.com/items/${productId}?attributes=id,title,category_id,price`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (response.ok) {
          const product = await response.json();
          productTitle = product.title || '';
          productCategory = product.category_id || '';
          productPrice = product.price || 0;
        }
      } catch (error) {
        console.warn('[ML Affiliates] Could not fetch product details:', error);
      }
    }

    const { data, error } = await supabase
      .from('ml_affiliate_links')
      .insert({
        product_url: productUrl,
        product_id: productId,
        product_title: productTitle,
        product_category: productCategory,
        product_price: productPrice,
        tracking_url: trackingUrl,
        short_url: shortUrl || null,
        campaign: campaign || 'vetor_blog',
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ link: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
