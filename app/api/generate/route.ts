import { NextResponse } from 'next/server';
import { generateReview } from '@/lib/generate';
import type { GenerateInput } from '@/lib/prompt';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json() as GenerateInput;
    const result = await generateReview(body);

    return NextResponse.json({
      success: true,
      data: result.data,
      provider: result.provider,
      seo: result.seo,
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
