import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const url = new URL(req.url);
  const reviewId = url.searchParams.get('id') || '5d55a581-a1c9-45f8-9c02-6681dcaf12a5';
  const testValue1 = 'JS-CLIENT-' + Date.now();
  const testValue2 = 'RAW-REST-' + Date.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing env' }, { status: 500 });
  }

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: original } = await client
    .from('reviews')
    .select('meta_title')
    .eq('id', reviewId)
    .single();

  const { data: jsResult, error: jsError } = await client
    .from('reviews')
    .update({ meta_title: testValue1 })
    .eq('id', reviewId)
    .select('meta_title');

  const { data: afterJs } = await client
    .from('reviews')
    .select('meta_title')
    .eq('id', reviewId)
    .single();

  const jsPersisted = afterJs?.meta_title === testValue1;

  const restRes = await fetch(`${supabaseUrl}/rest/v1/reviews?id=eq.${reviewId}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ meta_title: testValue2 }),
  });
  const restJson = await restRes.json();

  const { data: afterRest } = await client
    .from('reviews')
    .select('meta_title')
    .eq('id', reviewId)
    .single();

  const restPersisted = afterRest?.meta_title === testValue2;

  await client
    .from('reviews')
    .update({ meta_title: original?.meta_title })
    .eq('id', reviewId);

  return NextResponse.json({
    test1_jsClient: {
      wrote: testValue1,
      updateReturned: jsResult?.[0]?.meta_title,
      error: jsError,
      readBack: afterJs?.meta_title,
      persisted: jsPersisted,
    },
    test2_rawRest: {
      wrote: testValue2,
      status: restRes.status,
      returned: restJson?.[0]?.meta_title,
      readBack: afterRest?.meta_title,
      persisted: restPersisted,
    },
    originalValue: original?.meta_title,
    rowId: reviewId,
  });
}
