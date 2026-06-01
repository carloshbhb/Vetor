import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reviewId = url.searchParams.get('id') || '5d55a581-a1c9-45f8-9c02-6681dcaf12a5';
  const testValue = url.searchParams.get('val') || 'TEST-' + Date.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing env' }, { status: 500 });
  }

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Read BEFORE
  const { data: before } = await client
    .from('reviews')
    .select('id, slug, product, meta_title, updated_at')
    .eq('id', reviewId)
    .single();

  // 2. Update with just ONE field (meta_title) - same code path as PUT
  const { data: updateResult, error } = await client
    .from('reviews')
    .update({ meta_title: testValue })
    .eq('id', reviewId)
    .select('id, meta_title');

  // 3. Read AFTER
  const { data: after } = await client
    .from('reviews')
    .select('id, slug, product, meta_title, updated_at')
    .eq('id', reviewId)
    .single();

  return NextResponse.json({
    before,
    updateResult,
    updateError: error,
    after,
    persisted: after?.meta_title === testValue,
    beforeTitle: before?.meta_title,
    afterTitle: after?.meta_title,
    testValue,
  });
}
