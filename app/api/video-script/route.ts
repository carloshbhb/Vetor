import { NextResponse } from 'next/server';
import { getReviewById, getReviewBySlug } from '@/lib/db';
import { generateVideoScript } from '@/lib/video-script';

export const dynamic = 'force-dynamic';

// POST /api/video-script  { id?: string, slug?: string }
// Gera roteiro de Shorts 45-55s a partir de um review do Vetor Blog.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, slug } = body as { id?: string; slug?: string };

    if (!id && !slug) {
      return NextResponse.json(
        { error: 'Informe { id } ou { slug } do review' },
        { status: 400 }
      );
    }

    const review = id ? await getReviewById(id) : await getReviewBySlug(slug!);
    if (!review) {
      return NextResponse.json({ error: 'Review não encontrado' }, { status: 404 });
    }

    const script = await generateVideoScript(review);

    return NextResponse.json({
      success: true,
      review: { id: review.id, slug: review.slug, product: review.product },
      script,
      nextSteps: {
        audio: 'Gere o áudio com Edge-TTS (grátis) ou ElevenLabs usando script.fullNarration',
        render:
          'Monte o MP4 1080x1920 com ffmpeg (imagens do review + legendas). Veja scripts/make-shorts.mjs',
        publish:
          'Suba via YouTube Data API v3 ou abra o MP4 no app YouTube Create para finalizar',
      },
    });
  } catch (error: any) {
    console.error('video-script error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
