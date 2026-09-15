import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const legacyPath = path.resolve(process.cwd(), `/tmp/video-${id}/voiceover-combined.mp3`);
    const audioPath = path.resolve(process.cwd(), '/tmp/video-audio/voiceover-' + id + '.mp3');

    let sourcePath: string | null = null;
    if (fs.existsSync(audioPath)) {
      sourcePath = audioPath;
    } else if (fs.existsSync(legacyPath)) {
      sourcePath = legacyPath;
    }

    if (!sourcePath) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    const audioBuffer = fs.readFileSync(sourcePath);
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Audio fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 500 });
  }
}
