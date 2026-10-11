import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
config({ path: path.resolve(projectRoot, '.env.local') });

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value?.trim()) throw new Error(`[video-worker] Missing required environment variable: ${name}`);
  return value.trim();
}

const supabaseUrl = requiredEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');
requiredEnv('NVIDIA_API_KEY');
requiredEnv('YOUTUBE_CLIENT_ID');
requiredEnv('YOUTUBE_CLIENT_SECRET');
requiredEnv('YOUTUBE_REFRESH_TOKEN');
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const videoRoot = path.resolve(projectRoot, 'video');
const queueInputDir = path.join(videoRoot, 'temp', 'queue-input');

function runVideoProcessor(videoId: string, inputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'process-video', '--', videoId, inputPath], {
      cwd: videoRoot,
      env: {
        ...process.env,
        SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`Video processor exited with code ${code ?? 'unknown'}`)));
  });
}

async function processPendingVideos(): Promise<void> {
  const requestedLimit = Number.parseInt(process.env.VIDEO_LIMIT || '1', 10);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) throw new Error('[video-worker] VIDEO_LIMIT must be a positive integer.');
  const limit = Math.min(requestedLimit, 10);
  const { data: pending, error: pendingError } = await supabase
    .from('video_queue')
    .select('*')
    .eq('status', 'pending')
    .not('review_url', 'is', null)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);
  if (pendingError) throw pendingError;
  if (!pending?.length) {
    console.log('[video-worker] No due review video jobs pending.');
    return;
  }

  fs.mkdirSync(queueInputDir, { recursive: true });
  let completed = 0;
  let failed = 0;
  for (const job of pending) {
    const id = typeof job.id === 'string' ? job.id : '';
    if (!id) {
      failed += 1;
      console.error('[video-worker] Skipping queue row without an ID.');
      continue;
    }

    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from('video_queue')
      .update({ status: 'processing', started_at: claimedAt, error_message: null, updated_at: claimedAt })
      .eq('id', id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      console.log(`[video-worker] Job ${id} was claimed by another worker; skipping.`);
      continue;
    }

    const inputPath = path.join(queueInputDir, `${id}.json`);
    try {
      if (typeof claimed.product_title !== 'string' || !claimed.product_title.trim()) throw new Error('Queue item has no product title.');
      if (typeof claimed.product_image_url !== 'string' || !/^https?:\\/\\//i.test(claimed.product_image_url)) throw new Error('Queue item has no valid HTTP(S) product image URL.');
      if (typeof claimed.review_url !== 'string' || !/^https:\\/\\/www\\.vetor\\.blog\\/reviews\\//i.test(claimed.review_url)) {
        throw new Error('Only queue entries tied to a canonical Vetor review URL can be rendered by this worker.');
      }
      fs.writeFileSync(inputPath, JSON.stringify(claimed, null, 2), 'utf8');
      console.log(`[video-worker] Processing ${id}: ${claimed.product_title}`);
      await runVideoProcessor(id, inputPath);

      const { data: finalRow, error: finalError } = await supabase
        .from('video_queue')
        .select('status,youtube_url,youtube_video_id,error_message')
        .eq('id', id)
        .maybeSingle();
      if (finalError) throw finalError;
      if (finalRow?.status !== 'completed' || !finalRow.youtube_video_id || !/^https:\\/\\/youtube\\.com\\//i.test(finalRow.youtube_url || '')) {
        throw new Error(finalRow?.error_message || 'Processor ended without a confirmed YouTube publication URL.');
      }
      completed += 1;
      console.log(`[video-worker] Published: ${finalRow.youtube_url}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[video-worker] Job ${id} failed: ${message}`);
      await supabase.from('video_queue')
        .update({ status: 'failed', error_message: message.slice(0, 4000), updated_at: new Date().toISOString() })
        .eq('id', id);
    } finally {
      try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch { /* best-effort cleanup */ }
    }
  }

  console.log(`[video-worker] Summary: ${completed} published, ${failed} failed, ${pending.length} selected.`);
  if (failed > 0) process.exitCode = 1;
}

processPendingVideos().catch((error) => {
  console.error('[video-worker] Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
