import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Cron job para renovar o access_token do Mercado Livre.
 * O token expira em 6 horas — este cron roda a cada 5h para renovar antes da expiração.
 * Protegido por Authorization: Bearer <CRON_SECRET> (Vercel envia nativamente).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || req.nextUrl.searchParams.get('token');

  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mlClientId = process.env.ML_CLIENT_ID;
  const mlClientSecret = process.env.ML_CLIENT_SECRET;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  if (!mlClientId || !mlClientSecret) {
    return NextResponse.json({ error: 'ML_CLIENT_ID/ML_CLIENT_SECRET not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Buscar token atual
  const { data: mlToken, error: fetchError } = await supabase
    .from('ml_tokens')
    .select('*')
    .eq('id', 'current')
    .single();

  if (fetchError || !mlToken) {
    return NextResponse.json({
      success: false,
      error: 'No ML token found. Please authorize via /admin/ml first.',
    }, { status: 404 });
  }

  // Verificar se o token ainda não expirou (renovar preventivamente)
  const expiresAt = new Date(mlToken.expires_at);
  const now = new Date();
  const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilExpiry > 60) {
    return NextResponse.json({
      success: true,
      message: `Token still valid for ${Math.round(minutesUntilExpiry)} minutes. No refresh needed.`,
      expires_at: mlToken.expires_at,
    });
  }

  // Renovar o token
  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: mlClientId,
        client_secret: mlClientSecret,
        refresh_token: mlToken.refresh_token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[ML Refresh] Token refresh failed:', response.status, errorData);
      return NextResponse.json({
        success: false,
        error: `Refresh failed: ${response.status}`,
        details: errorData,
      }, { status: 500 });
    }

    const data = await response.json();
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Atualizar no Supabase
    const { error: updateError } = await supabase
      .from('ml_tokens')
      .upsert({
        id: 'current',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error('[ML Refresh] Failed to update tokens in Supabase:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save refreshed token',
      }, { status: 500 });
    }

    console.log('[ML Refresh] Token refreshed successfully, new expires_at:', newExpiresAt);

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expires_at: newExpiresAt,
    });

  } catch (error: any) {
    console.error('[ML Refresh] Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
