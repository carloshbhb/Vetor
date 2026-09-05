import { NextResponse } from 'next/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getReviewBySlug } from '@/lib/db';
import { generateVideoScript } from '@/lib/video-script';
import { uploadToYoutube } from '@/lib/youtube';
import { markJob } from '@/lib/video-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/video-publish { slug, privacy?: "private"|"unlisted"|"public", videoPath?: string }
// Se videoPath não for informado, espera o MP4 em tmp/<slug>.mp4 (gerado pelo pipeline gratuito).
// Fluxo gratuito completo: /api/video-script → edge-tts + ffmpeg → /api/video-publish
export async function POST(req: Request) {
  try {
    const { slug, privacy, videoPath } = (await req.json().catch(() => ({}))) as {
      slug?: string;
      privacy?: 'private' | 'unlisted' | 'public';
      videoPath?: string;
    };
    if (!slug) return NextResponse.json({ error: 'Informe { slug }' }, { status: 400 });

    const review = await getReviewBySlug(slug);
    if (!review) return NextResponse.json({ error: 'Review não encontrado' }, { status: 404 });

    const script = await generateVideoScript(review);
    const resolvedPath =
      videoPath || path.join(os.tmpdir(), `${review.slug}.mp4`);
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        {
          error: `MP4 não encontrado em ${resolvedPath}. Gere antes com: node scripts/make-shorts.mjs --slug ${slug}`,
          script,
        },
        { status: 400 }
      );
    }

    const url = await uploadToYoutube({
      videoPath: resolvedPath,
      title: script.title,
      description: `${script.description}\n\nReview completo: ${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog')}/review/${review.slug}`,
      tags: script.tags,
      privacy: privacy || 'unlisted',
    });
    const videoId = url.split('/').pop() || null;
    await markJob(review.slug, { status: 'published', youtube_url: url, youtube_video_id: videoId, error: null });

    return NextResponse.json({ success: true, url, script });
  } catch (err: any) {
    console.error('video-publish error:', err);
    return NextResponse.json({ error: err.message || 'Falha ao publicar' }, { status: 500 });
  }
}
