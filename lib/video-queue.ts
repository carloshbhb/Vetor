// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Fila de vídeos (16/dia = GitHub Actions free tier)
// Regra: backlog primeiro (reviews publicados mais antigos sem vídeo),
// depois os reviews novos do dia. Quando zerar o backlog, o cron passa
// a gerar só 1-2/dia (os novos do autonomous-agent).
// Storage: Supabase video_jobs; fallback local data/video-jobs.json (dev).
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

export const DAILY_VIDEO_LIMIT = 16;

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
  render_engine?: 'ffmpeg' | 'remotion';
  packagingStatus?: 'pending' | 'packaged' | 'failed';
  viralScore?: number;
  ctrEstimate?: number;
  hookScore?: number;
  retentionScore?: number;
  source?: 'backlog' | 'fresh' | 'viral' | 'manual';
  created_at?: string;
  updated_at?: string;
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
  const all: string[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb.from('video_jobs').select('slug').eq('status', 'published').range(from, from + pageSize - 1);
    if (error) break;
    if (!data?.length) break;
    for (const r of data as any[]) if (r.slug) all.push(r.slug);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return new Set(all);
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
    .lt('attempts', maxAttempts)
    .limit(1000);
  return (data || []).map((r: any) => r.slug);
}

// Todos os slugs que JÁ têm linha na fila (qualquer status, inclusive com vídeo
// publicado). Regra 1 review = 1 vídeo: o cron nunca regenera esses slugs,
// mesmo se o status voltar para script_ready por qualquer motivo.
// Paginação real para evitar retorno parcial em serverless (Supabase postgREST limita 1000 por página)
// @param excludeStatuses — status a excluir do retorno (ex: ['failed'] para
// permitir retry de jobs falhados; ver app/api/cron/video-queue/route.ts).
// Default [] = comportamento original (todos os status), mantendo callers existentes.
export async function getAllJobSlugs(excludeStatuses: string[] = []): Promise<Set<string>> {
  const excluded = new Set(excludeStatuses);
  const sb = supabaseAdmin();
  if (!sb) return new Set(readFallback().filter((j) => !excluded.has(j.status)).map((j) => j.slug));
  const all: string[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = sb.from('video_jobs').select('slug');
    if (excluded.size > 0) {
      query = query.not('status', 'in', `(${Array.from(excluded).join(',')})`);
    }
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) { console.error('[video-queue] getAllJobSlugs error', error.message); break; }
    if (!data?.length) break;
    for (const r of data as any[]) if (r.slug) all.push(r.slug);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`[video-queue] getAllJobSlugs total=${all.length}`);
  return new Set(all);
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
    .limit(Math.min(limit, 1000));
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

export async function upsertScriptJob(job: VideoJob, opts?: { force?: boolean; renderEngine?: 'ffmpeg' | 'remotion' }): Promise<'created' | 'skipped'> {
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
  const row: Record<string, any> = {
    review_id: job.review_id,
    slug: job.slug,
    product: job.product,
    status: 'script_ready',
    script: job.script,
    attempts: 0,
    render_engine: opts?.renderEngine || 'remotion',
    updated_at: new Date().toISOString(),
  };
  if (job.packagingStatus != null) row.packaging_status = job.packagingStatus;
  if (job.viralScore != null) row.viral_score = job.viralScore;
  if (job.ctrEstimate != null) row.ctr_estimate = job.ctrEstimate;
  if (job.hookScore != null) row.hook_score = job.hookScore;
  if (job.retentionScore != null) row.retention_score = job.retentionScore;
  if (job.source != null) row.source = job.source;
  await sb.from('video_jobs').upsert(row, { onConflict: 'slug' });
  return 'created';
}

// Incrementa attempts de um job (best-effort). Usado quando a GERAÇÃO do roteiro
// falha (gate assertValidVideoScript): nesse caminho o worker nunca é alcançado
// para incrementar, e o upsert reseta attempts=0 — sem isso o retry seria infinito.
export async function bumpJobAttempts(slug: string, error?: string): Promise<void> {
  const sb = supabaseAdmin();
  if (!sb) {
    const all = readFallback();
    const i = all.findIndex((j) => j.slug === slug);
    if (i >= 0) {
      all[i] = { ...all[i], attempts: (all[i].attempts || 0) + 1, ...(error ? { error } : {}), updated_at: new Date().toISOString() } as any;
      writeFallback(all);
    }
    return;
  }
  const { data } = await sb.from('video_jobs').select('attempts').eq('slug', slug).maybeSingle();
  if (!data) return;
  await sb.from('video_jobs').update({
    attempts: ((data as any).attempts || 0) + 1,
    ...(error ? { error } : {}),
    updated_at: new Date().toISOString(),
  }).eq('slug', slug);
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

// ── Premium (Remotion) ──────────────────────────────────────────────────────
// Busca 1 job marcado como render_engine='remotion' e status='script_ready'
export async function getPremiumJob(): Promise<VideoJob | null> {
  const sb = supabaseAdmin();
  if (!sb) {
    const fallback = readFallback().find(
      (j) => j.render_engine === 'remotion' && j.status === 'script_ready'
    );
    return fallback || null;
  }
  const { data } = await sb
    .from('video_jobs')
    .select('*')
    .eq('render_engine', 'remotion')
    .eq('status', 'script_ready')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as VideoJob) || null;
}

// Marca 1 job da fila como premium (render_engine='remotion')
// Seleciona o job mais antigo sem vídeo publicado que ainda não foi marcado como remotion
export async function markNextAsPremium(): Promise<string | null> {
  const sb = supabaseAdmin();
  if (!sb) {
    const all = readFallback();
    const candidate = all.find(
      (j) => j.status === 'script_ready' && j.render_engine !== 'remotion' && !j.youtube_video_id
    );
    if (candidate) {
      candidate.render_engine = 'remotion';
      candidate.updated_at = new Date().toISOString();
      writeFallback(all);
      return candidate.slug;
    }
    return null;
  }

  // Busca 1 job script_ready que NÃO é remotion e não tem vídeo publicado
  const { data: candidate } = await sb
    .from('video_jobs')
    .select('slug')
    .eq('status', 'script_ready')
    .neq('render_engine', 'remotion')
    .is('youtube_video_id', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!candidate) return null;

  await sb.from('video_jobs').update({
      render_engine: 'remotion',
      updated_at: new Date().toISOString(),
    })
    .eq('slug', candidate.slug);

  return candidate.slug;
}

// Verifica se já foi gerado 1 premium hoje
export async function getPremiumTodayCount(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const sb = supabaseAdmin();
  if (!sb) {
    return readFallback().filter(
      (j: any) =>
        j.render_engine === 'remotion' &&
        j.updated_at &&
        new Date(j.updated_at) >= start
    ).length;
  }
  const { count } = await sb
    .from('video_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('render_engine', 'remotion')
    .gte('updated_at', start.toISOString());
  return count || 0;
}

export async function getViralJobs(limit?: number): Promise<VideoJob[]> {
  const effectiveLimit = limit ?? 20;
  const sb = supabaseAdmin();
  if (!sb) {
    return readFallback()
      .filter((j) => j.source === 'viral' && j.status === 'script_ready')
      .sort((a, b) => (b.viralScore ?? 0) - (a.viralScore ?? 0))
      .slice(0, effectiveLimit);
  }
  const { data } = await sb
    .from('video_jobs')
    .select('*')
    .eq('source', 'viral')
    .eq('status', 'script_ready')
    .order('viralScore', { ascending: false })
    .limit(Math.min(effectiveLimit, 1000));
  return (data || []) as VideoJob[];
}

export async function getPackagingStats(): Promise<{
  total: number;
  pending: number;
  packaged: number;
  failed: number;
  avgViralScore: number;
  avgCtrEstimate: number;
}> {
  const sb = supabaseAdmin();
  if (!sb) {
    const all = readFallback();
    const total = all.length;
    const pending = all.filter((j) => j.packagingStatus === 'pending').length;
    const packaged = all.filter((j) => j.packagingStatus === 'packaged').length;
    const failed = all.filter((j) => j.packagingStatus === 'failed').length;
    const withViral = all.filter((j) => j.viralScore != null);
    const avgViralScore = withViral.length
      ? withViral.reduce((s, j) => s + (j.viralScore ?? 0), 0) / withViral.length
      : 0;
    const withCtr = all.filter((j) => j.ctrEstimate != null);
    const avgCtrEstimate = withCtr.length
      ? withCtr.reduce((s, j) => s + (j.ctrEstimate ?? 0), 0) / withCtr.length
      : 0;
    return { total, pending, packaged, failed, avgViralScore, avgCtrEstimate };
  }
  const { data: rows } = await sb.from('video_jobs').select('packagingStatus,viralScore,ctrEstimate');
  const all = (rows || []) as VideoJob[];
  const total = all.length;
  const pending = all.filter((j) => j.packagingStatus === 'pending').length;
  const packaged = all.filter((j) => j.packagingStatus === 'packaged').length;
  const failed = all.filter((j) => j.packagingStatus === 'failed').length;
  const withViral = all.filter((j) => j.viralScore != null);
  const avgViralScore = withViral.length
    ? withViral.reduce((s, j) => s + (j.viralScore ?? 0), 0) / withViral.length
    : 0;
  const withCtr = all.filter((j) => j.ctrEstimate != null);
  const avgCtrEstimate = withCtr.length
    ? withCtr.reduce((s, j) => s + (j.ctrEstimate ?? 0), 0) / withCtr.length
    : 0;
  return { total, pending, packaged, failed, avgViralScore, avgCtrEstimate };
}
