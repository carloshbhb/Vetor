import { NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reviews = await getPublishedReviews();
    return NextResponse.json({
      count: reviews.length,
      slugs: reviews.map(r => r.slug),
      env: {
        SUPABASE_FALLBACK_TO_FILE: process.env.SUPABASE_FALLBACK_TO_FILE,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
