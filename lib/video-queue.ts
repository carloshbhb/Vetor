// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Fila de vídeos (30/dia = cota YouTube Data API)
// Regra: backlog primeiro (reviews publicados mais antigos sem vídeo),
// depois os reviews novos do dia. Quando zerar o backlog, o cron passa
// a gerar só 1-2/dia (os novos do autonomous-agent).
// Storage: Supabase video_jobs; fallback local data/video-jobs.json (dev).
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

export const DAILY_VIDEO_LIMIT = 30;

export interface VideoJob {
  id?: string;
  review_id?: string;
  slug: string;
  product: string;
  status: 'script_ready' | 'rendering' | 'ready_mp4' | 'published' | 'failed';
  script?: any;
  youtube_video_id?: string | null;
  youtube_url?: string | null;
  error?: string | null;
  attempts?: number;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const FALLBACK_PATH = path.join(process.cwd(), 'data', 'video-jobs.json');

function readFallback(): VideoJob[] {
  try {
    if (!fs.existsSync(FALLBACK_PATH)) return [];
    return JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeFallback(jobs: VideoJob[]) {
  fs.writeFileSync(FALLBACK_PATH, JSON.stringify(jobs, null, 2));
}

export async function getPublishedJobSlugs(): Promise<Set<string>> {
  const sb = supabaseAdmin();
  if (!sb) return new Set(readFallback().filter((j) => j.status === 'published').map((j) => j.slug));
  const { data } = await sb.from('video_jobs').select('slug').eq('status', 'published');
  return new Set((data || []).map((r: any) => r.slug));
}

// Slugs com falha e tentativas restantes (p/ retry — sem isso um job falhado
// nunca mais é pego, pois a regra 1-review-1-video exclui slugs com linha na fila)
export async function getFailedSlugs(maxAttempts = 3): Promise<string[]> {
  const sb = supabaseAdmin();
  if (!sb) {
    return readFallback()
      .filter((j) => j.status === 'failed' && (j.attempts || 0) < maxAttempts)
      .map((j) => j.slug);
  }
  const { data } = await sb
    .from('video_jobs')
    .select('slug,attempts')
    .eq('status', 'failed')
    .lt('attempts', maxAttempts);
  return (data || []).map((r: any) => r.slug);
}

// Todos os slugs que JÁ têm linha na fila (qualquer status, inclusive com vídeo
// publicado). Regra 1 review = 1 vídeo: o cron nunca regenera esses slugs,
// mesmo se o status voltar para script_ready por qualquer motivo.
export async function getAllJobSlugs(): Promise<Set<string>> {
  const sb = supabaseAdmin();
  if (!sb) return new Set(readFallback().map((j) => j.slug));
  const { data } = await sb.from('video_jobs').select('slug');
  return new Set((data || []).map((r: any) => r.slug));
}

export async function getPendingJobs(limit = 20): Promise<VideoJob[]> {
  const sb = supabaseAdmin();
  if (!sb) {
    return readFallback()
      .filter((j) => ['script_ready', 'rendering', 'ready_mp4'].includes(j.status))
      .slice(0, limit);
  }
  const { data } = await sb
    .from('video_jobs')
    .select('*')
    .in('status', ['script_ready', 'rendering', 'ready_mp4'])
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data || []) as VideoJob[];
}

export async function getJobsTodayCount(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const sb = supabaseAdmin();
  if (!sb) {
    return readFallback().filter((j: any) => j.updated_at && new Date(j.updated_at) >= start && j.status === 'published').length;
  }
  const { count } = await sb
    .from('video_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('updated_at', start.toISOString());
  return count || 0;
}

export async function upsertScriptJob(job: VideoJob, opts?: { force?: boolean }): Promise<'created' | 'skipped'> {
  const sb = supabaseAdmin();
  if (!sb) {
    const all = readFallback();
    const i = all.findIndex((j) => j.slug === job.slug);
    const existing = i >= 0 ? all[i] : null;
    // Trava anti-duplicado: nunca rebaixa linha que já tem vídeo publicado
    if (existing && (existing.status === 'published' || existing.youtube_video_id) && !opts?.force) {
      return 'skipped';
    }
    const row = { ...job, updated_at: new Date().toISOString() } as any;
    if (i >= 0) all[i] = { ...all[i], ...row };
    else all.push({ ...row, created_at: new Date().toISOString() });
    writeFallback(all);
    return 'created';
  }
  // Trava anti-duplicado no banco antes do upsert
  const { data: existing } = await sb
    .from('video_jobs')
    .select('status,youtube_video_id')
    .eq('slug', job.slug)
    .maybeSingle();
  if (existing && (existing.status === 'published' || (existing as any).youtube_video_id) && !opts?.force) {
    return 'skipped';
  }
  await sb.from('video_jobs').upsert(
    {
      review_id: job.review_id,
      slug: job.slug,
      product: job.product,
      status: 'script_ready',
      script: job.script,
      attempts: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' }
  );
  return 'created';
}

export async function markJob(slug: string, patch: Partial<VideoJob>): Promise<void> {
  const sb = supabaseAdmin();
  if (!sb) {
    const all = readFallback();
    const i = all.findIndex((j) => j.slug === slug);
    if (i >= 0) {
      all[i] = { ...all[i], ...patch, updated_at: new Date().toISOString() } as any;
      writeFallback(all);
    }
    return;
  }
  await sb.from('video_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('slug', slug);
}

export async function getAllJobs(limit = 50): Promise<VideoJob[]> {
  const sb = supabaseAdmin();
  if (!sb) return readFallback().slice(-limit).reverse();
  const { data } = await sb.from('video_jobs').select('*').order('updated_at', { ascending: false }).limit(limit);
  return (data || []) as VideoJob[];
}
