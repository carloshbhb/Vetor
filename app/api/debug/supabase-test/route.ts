import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const report: any = {
    env: {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      fallbackToFile: process.env.SUPABASE_FALLBACK_TO_FILE,
    },
    tests: {},
  };

  if (!url || !serviceKey) {
    return NextResponse.json({ ...report, error: 'Missing env vars' }, { status: 500 });
  }

  const client = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Test 1: Read first review
  try {
    const { data, error } = await client
      .from('reviews')
      .select('id, slug, product, meta_title, updated_at')
      .limit(1);

    if (error) {
      report.tests.read = { ok: false, error: error.message };
    } else {
      report.tests.read = { ok: true, count: data?.length, first: data?.[0] };
    }
  } catch (e: any) {
    report.tests.read = { ok: false, error: e.message };
  }

  // Test 2: Update via Supabase client - test with "product" field (not updated_at)
  if (report.tests.read?.ok && report.tests.read.first) {
    const testId = report.tests.read.first.id;
    const origProduct = report.tests.read.first.product;
    const testProduct = origProduct + ' [TEST-' + Date.now() + ']';

    try {
      const { data, error: writeErr } = await client
        .from('reviews')
        .update({ product: testProduct })
        .eq('id', testId)
        .select('id, product');

      if (writeErr) {
        report.tests.writeProduct = { ok: false, error: writeErr.message };
      } else {
        // Read back immediately
        const { data: after } = await client
          .from('reviews')
          .select('product')
          .eq('id', testId)
          .single();

        report.tests.writeProduct = {
          ok: true,
          persisted: after?.product === testProduct,
          before: origProduct,
          wrote: testProduct,
          readBack: after?.product,
          updateReturned: data?.[0]?.product,
        };

        // Revert
        await client.from('reviews').update({ product: origProduct }).eq('id', testId);
      }
    } catch (e: any) {
      report.tests.writeProduct = { ok: false, error: e.message };
    }
  }

  // Test 3: Update via raw REST API (bypass JS client)
  if (report.tests.read?.ok && report.tests.read.first) {
    const testId = report.tests.read.first.id;
    const origTitle = report.tests.read.first.meta_title;
    const testTitle = origTitle + ' [REST-' + Date.now() + ']';

    try {
      const res = await fetch(`${url}/rest/v1/reviews?id=eq.${testId}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ meta_title: testTitle }),
      });

      const json = await res.json();

      report.tests.writeRest = {
        ok: res.ok,
        status: res.status,
        returned: json?.[0]?.meta_title,
        count: json?.length,
      };

      // Read back
      const { data: after } = await client
        .from('reviews')
        .select('meta_title')
        .eq('id', testId)
        .single();

      report.tests.writeRest.persisted = after?.meta_title === testTitle;
      report.tests.writeRest.readBack = after?.meta_title;

      // Revert
      await client.from('reviews').update({ meta_title: origTitle }).eq('id', testId);
    } catch (e: any) {
      report.tests.writeRest = { ok: false, error: e.message };
    }
  }

  // Test 4: Check RLS policies via raw query
  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_rls_policies`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      report.tests.rlsCheck = await res.json();
    } else {
      report.tests.rlsCheck = { status: res.status, note: 'RPC may not exist' };
    }
  } catch (e: any) {
    report.tests.rlsCheck = { error: e.message, note: 'RPC not available' };
  }

  return NextResponse.json(report);
}
