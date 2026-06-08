import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const report: Record<string, unknown> = {
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

  try {
    const { data, error } = await client
      .from('reviews')
      .select('id, slug, product, meta_title, updated_at')
      .limit(1);

    if (error) {
      report.tests = { read: { ok: false, error: error.message } };
    } else {
      report.tests = { read: { ok: true, count: data?.length, first: data?.[0] } };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    report.tests = { read: { ok: false, error: message } };
  }

  return NextResponse.json(report);
}
