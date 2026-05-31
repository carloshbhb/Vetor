import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { uploadImage } from '@/lib/supabase-storage';

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: Request) {
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, WebP, AVIF' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .slice(0, 40);
    const filename = `${safeName}-${timestamp}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Try Supabase Storage first
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseUrl = await uploadImage(buffer, filename, file.type);
      if (supabaseUrl) {
        return NextResponse.json({ url: supabaseUrl }, { status: 201 });
      }
      console.warn('[Upload] Supabase Storage failed, falling back to local filesystem.');
    }

    // Fallback to local filesystem
    const filepath = path.join(UPLOADS_DIR, filename);
    let url = `/uploads/${filename}`;
    try {
      fs.writeFileSync(filepath, buffer);
    } catch (err: any) {
      console.warn('[Upload] Failed to save file to public directory (read-only filesystem). Falling back to Base64 Data URL.', err.message);
      const base64 = buffer.toString('base64');
      url = `data:${file.type};base64,${base64}`;
    }

    return NextResponse.json({ url }, { status: 201 });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
