import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fallback = process.env.SUPABASE_FALLBACK_TO_FILE;

  const report: any = {
    env: {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
      fallbackToFile: fallback,
      urlPrefix: url?.substring(0, 30),
    },
    tests: {},
  };

  if (!url || !serviceKey) {
    report.error = 'Missing env vars';
    return NextResponse.json(report, { status: 500 });
  }

  const client = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Test 1: Read first review
  try {
    const { data, error } = await client
      .from('reviews')
      .select('id, slug, product')
      .limit(1);

    if (error) {
      report.tests.read = { ok: false, error: error.message };
    } else {
      report.tests.read = { ok: true, count: data?.length, first: data?.[0] };
    }
  } catch (e: any) {
    report.tests.read = { ok: false, error: e.message };
  }

  // Test 2: Write test - update first review's updated_at to now, then revert
  if (report.tests.read?.ok && report.tests.read.first) {
    const testId = report.tests.read.first.id;
    const now = new Date().toISOString();

    try {
      // Read original
      const { data: orig } = await client
        .from('reviews')
        .select('updated_at')
        .eq('id', testId)
        .single();

      // Write
      const { error: writeErr } = await client
        .from('reviews')
        .update({ updated_at: now })
        .eq('id', testId);

      if (writeErr) {
        report.tests.write = { ok: false, error: writeErr.message };
      } else {
        // Read back
        const { data: after } = await client
          .from('reviews')
          .select('updated_at')
          .eq('id', testId)
          .single();

        const persisted = after?.updated_at === now;
        report.tests.write = {
          ok: true,
          persisted,
          before: orig?.updated_at,
          wrote: now,
          readBack: after?.updated_at,
        };

        // Revert
        if (orig?.updated_at) {
          await client
            .from('reviews')
            .update({ updated_at: orig.updated_at })
            .eq('id', testId);
        }
      }
    } catch (e: any) {
      report.tests.write = { ok: false, error: e.message };
    }
  }

  // Test 3: Check what getReviewById returns via db.ts
  try {
    const { getReviewById } = await import('@/lib/db');
    const testSlug = report.tests.read?.first?.slug;
    if (testSlug) {
      const review = await getReviewById(report.tests.read.first.id);
      report.tests.dbTsGetReviewById = {
        ok: !!review,
        hasData: !!review,
        slug: review?.slug,
        product: review?.product,
      };
    }
  } catch (e: any) {
    report.tests.dbTsGetReviewById = { ok: false, error: e.message };
  }

  return NextResponse.json(report);
}
