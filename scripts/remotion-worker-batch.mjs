// Worker Remotion BATCH: renderiza múltiplos vídeos/dia com animações React
// Busca N jobs com render_engine='remotion' → edge-tts → conversor → Remotion render → YouTube
// Uso: REMOTION_BATCH=8 node scripts/remotion-worker-batch.mjs
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync, copyFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadImage, uploadToYoutube, setThumbnail, postReviewComment } from '../lib/video-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REMOTION_DIR = path.join(ROOT, 'remotion');

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const BASE = (process.env.SITE_BASE || 'https://www.vetor.blog').replace(/\/$/, '');
const PRIVACY = process.env.YOUTUBE_PRIVACY || 'public';
const TTS_VOICE = process.env.TTS_VOICE || 'pt-BR-AntonioNeural';
const BATCH_SIZE = Math.min(Math.max(Number(process.env.REMOTION_BATCH || 8), 1), 16);

const run = (cmd, opts = {}) => {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit', ...opts });
};

// ── Supabase ────────────────────────────────────────────────────────────────
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Converter ───────────────────────────────────────────────────────────────
const { convertVideoScriptToRemotionData, convertVideoScriptToLongFormData } = await import('./video-to-remotion-data.mjs');

// ── Helpers ─────────────────────────────────────────────────────────────────
const fileOk = (p, minBytes = 2048) => {
  try { return existsSync(p) && statSync(p).size >= minBytes; } catch { return false; }
};

const mp4Ok = (mp4, minBytes = 50000) => {
  try {
    if (!fileOk(mp4, minBytes)) return false;
    try {
      execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "${mp4}"`, { stdio: 'pipe' });
      return true;
    } catch { return false; }
  } catch { return false; }
};

async function renderJob(job) {
  const slug = job.slug;
  const script = job.script || {};
  console.log(`\n═══ ${slug} ═══`);

  // Claim atômico
  const { data: claimed } = await sb
    .from('video_jobs')
    .update({
      status: 'rendering',
      attempts: (job.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .eq('status', 'script_ready')
    .select('slug');

  if (!claimed?.length) {
    console.log('Job já assumido por outro runner, pulando.');
    return 'skipped';
  }

  // Anti-duplicado
  if (job.youtube_video_id) {
    await sb.from('video_jobs').update({ status: 'published', error: null }).eq('slug', slug);
    console.log(`Já tem vídeo (${job.youtube_video_id}), pulando.`);
    return 'skipped';
  }

  // Validar payload
  const nar = String(script.fullNarration || '').trim();
  const scenesCount = Array.isArray(script.scenes) ? script.scenes.length : 0;
  if (nar.length < 50 || !Array.isArray(script.scenes) || scenesCount === 0) {
    const skipErr = `SKIP queue-bad-payload: fullNarration=${nar.length} scenes=${scenesCount}`;
    await sb.from('video_jobs').update({ status: 'failed', error: skipErr }).eq('slug', slug);
    console.warn(`[SKIP] ${slug}: payload inválido (${skipErr})`);
    return 'failed';
  }

  const tmp = os.tmpdir();
  const txt = path.join(tmp, `${slug}.txt`);
  const mp3 = path.join(tmp, `${slug}.mp3`);
  const mp4 = path.join(tmp, `${slug}.mp4`);
  const srt = path.join(tmp, `${slug}.srt`);
  const thumb = path.join(tmp, `${slug}.thumb.jpg`);

  try {
    // ── 1. Gerar áudio com edge-tts ──────────────────────────────────────
    console.log('[1/5] Gerando áudio...');
    writeFileSync(txt, script.fullNarration || '', 'utf8');
    try {
      run(`edge-tts --voice ${TTS_VOICE} --file "${txt}" --write-media "${mp3}" --write-subtitles "${srt}"`);
    } catch (e) {
      console.warn('edge-tts com legendas falhou, tentando sem legendas:', e.message?.slice(0, 120));
      run(`edge-tts --voice ${TTS_VOICE} --file "${txt}" --write-media "${mp3}"`);
    }
    if (!fileOk(mp3, 1024)) throw new Error(`TTS falhou: mp3 ausente ou vazio para ${slug}`);

    // ── 2. Preparar áudio para Remotion ──────────────────────────────────
    console.log('[2/5] Preparando áudio...');
    const audioDir = path.join(REMOTION_DIR, 'public', 'audio');
    if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });
    copyFileSync(mp3, path.join(audioDir, 'full.mp3'));

    // ── 3. Converter VideoScript → video-data.json ───────────────────────
    console.log('[3/5] Convertendo roteiro...');
    let reviewData = {};
    try {
      const { data: rev } = await sb
        .from('reviews')
        .select('image_url, meta_og_image, affiliate_url, hero_lead, hero_overall_score, verdict_score, verdict_label, testimonials')
        .eq('slug', slug)
        .single();
      reviewData = rev || {};
    } catch (e) {
      console.warn('[3/5] Review fetch failed:', e.message);
    }

    // Skip jobs without meli.la affiliate URL
    const affiliateUrl = reviewData.affiliate_url || '';
    if (!affiliateUrl || !affiliateUrl.includes('meli')) {
      const skipErr = `SKIP no-meli-url: affiliate_url=${affiliateUrl || 'empty'}`;
      await sb.from('video_jobs').update({ status: 'failed', error: skipErr }).eq('slug', slug);
      console.warn(`[SKIP] ${slug}: ${skipErr}`);
      return 'failed';
    }

    const isLongForm = script.estimatedSeconds > 60;
    const convertFn = isLongForm ? convertVideoScriptToLongFormData : convertVideoScriptToRemotionData;
    const remotionData = convertFn(
      script,
      {
        ...reviewData,
        slug,
        product: job.product || slug,
        affiliateUrl: reviewData.affiliate_url || '',
        imageUrl: reviewData.image_url || reviewData.meta_og_image || '',
        hero: { overallScore: reviewData.hero_overall_score || 8, lead: reviewData.hero_lead || '' },
        verdict: { score: reviewData.verdict_score || 8, label: reviewData.verdict_label || '' },
        testimonials: reviewData.testimonials || [],
      },
      BASE
    );
    console.log(`[3/5] ${isLongForm ? 'Long-form' : 'Short-form'} - ${remotionData.meta.duration}s`);

    // ── 3b. Baixar imagens ───────────────────────────────────────────────
    console.log('[3b/5] Baixando imagens...');
    const imagesDir = path.join(REMOTION_DIR, 'public', 'images');
    if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });

    const allImageUrls = new Set();
    if (remotionData.meta.productImage) allImageUrls.add(remotionData.meta.productImage);
    for (const section of remotionData.sections) {
      if (section.visual?.backgroundImage) allImageUrls.add(section.visual.backgroundImage);
      if (section.visual?.left?.imageUrl) allImageUrls.add(section.visual.left.imageUrl);
      if (section.visual?.right?.imageUrl) allImageUrls.add(section.visual.right.imageUrl);
      if (section.visual?.product?.imageUrl) allImageUrls.add(section.visual.product.imageUrl);
      if (Array.isArray(section.visual?.gallery)) {
        for (const url of section.visual.gallery) { if (url) allImageUrls.add(url); }
      }
      if (Array.isArray(section.segments)) {
        for (const seg of section.segments) {
          if (seg.visual?.left?.imageUrl) allImageUrls.add(seg.visual.left.imageUrl);
          if (seg.visual?.right?.imageUrl) allImageUrls.add(seg.visual.right.imageUrl);
          if (seg.visual?.product?.imageUrl) allImageUrls.add(seg.visual.product.imageUrl);
          if (Array.isArray(seg.visual?.gallery)) {
            for (const url of seg.visual.gallery) { if (url) allImageUrls.add(url); }
          }
        }
      }
    }

    const urlToLocal = {};
    let imgIdx = 0;
    for (const url of allImageUrls) {
      const ext = url.includes('.webp') ? '.webp' : url.includes('.png') ? '.png' : '.jpg';
      const localName = `${slug}-${imgIdx++}${ext}`;
      const localPath = path.join(imagesDir, localName);
      const publicPath = `images/${localName}`;
      const ok = await downloadImage(url, localPath);
      if (ok) urlToLocal[url] = publicPath;
    }

    const replaceUrls = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string' && urlToLocal[obj[key]]) {
          obj[key] = urlToLocal[obj[key]];
        } else if (Array.isArray(obj[key])) {
          obj[key] = obj[key].map(item => (typeof item === 'string' && urlToLocal[item]) ? urlToLocal[item] : item);
          obj[key].forEach(item => { if (typeof item === 'object') replaceUrls(item); });
        } else if (typeof obj[key] === 'object') {
          replaceUrls(obj[key]);
        }
      }
    };
    replaceUrls(remotionData);

    writeFileSync(
      path.join(REMOTION_DIR, 'video-data.json'),
      JSON.stringify(remotionData, null, 2),
      'utf8'
    );

    // ── 3c. Gerar QR code como PNG estático ──────────────────────────────
    console.log('[3c/5] Gerando QR code...');
    const QRCode = await import('qrcode');
    const qrDir = path.join(REMOTION_DIR, 'public');
    if (!existsSync(qrDir)) mkdirSync(qrDir, { recursive: true });
    const qrPath = path.join(qrDir, 'qr.png');
    if (affiliateUrl) {
      await QRCode.toFile(qrPath, affiliateUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });
      console.log(`  QR code salvo: ${qrPath}`);
    } else {
      console.warn('  Sem affiliate URL, QR code não gerado');
    }

    // ── 4. Renderizar com Remotion ───────────────────────────────────────
    const outDir = path.join(REMOTION_DIR, 'out');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outputPath = path.join(outDir, `${slug}.mp4`);

    if (existsSync(outputPath)) {
      console.log('[4/5] Vídeo já existe, pulando render...');
    } else {
      console.log('[4/5] Renderizando com Remotion...');
      const renderComponent = isLongForm ? 'LongVideo' : 'ShortVideo';

      const propsPath = path.join(REMOTION_DIR, 'props.json');
      writeFileSync(propsPath, JSON.stringify({ data: remotionData }), 'utf8');

      const renderFlags = isLongForm
        ? '--concurrency=4 --gl=angle --codec h264 --timeout=120000'
        : '--concurrency=2 --gl=angle --codec h264';
      run(`npx remotion render ${renderComponent} "${outputPath}" --props=props.json ${renderFlags}`, { cwd: REMOTION_DIR });

      if (!existsSync(outputPath)) {
        throw new Error('Remotion render falhou: arquivo não gerado');
      }
    }

    // ── 4.1 Verificação visual ───────────────────────────────────────────
    console.log('[4.1/5] Verificando render...');
    let videoDuration = 0;
    try {
      const probe = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`, { encoding: 'utf-8' });
      videoDuration = parseFloat(probe.trim());
    } catch {}

    const positions = [0.1, 0.5, 0.9];
    for (const pct of positions) {
      const timestamp = videoDuration * pct;
      const framePath = path.join(outDir, `${slug}_${Math.round(pct * 100)}.jpg`);
      try {
        execSync(`ffmpeg -y -ss ${timestamp} -i "${outputPath}" -frames:v 1 -update 1 -q:v 3 "${framePath}"`, { stdio: 'pipe' });
        const size = existsSync(framePath) ? statSync(framePath).size : 0;
        console.log(`  ${Math.round(pct * 100)}%: ${size > 5000 ? '✓' : '✗'}`);
      } catch {}
    }

    // ── 5. Upload para YouTube ───────────────────────────────────────────
    console.log('[5/5] Subindo ao YouTube...');
    const description =
      `${script.description || ''}` +
      `\n\n🛒 Ver oferta: ${affiliateUrl}` +
      `\n📝 Review completo: ${BASE}/review/${slug}`;

    const up = await uploadToYoutube(outputPath, {
      title: script.title,
      description,
      tags: script.tags,
      privacy: PRIVACY,
    });

    // Thumbnail
    try {
      run(`ffmpeg -y -ss 00:00:10 -i "${outputPath}" -frames:v 1 -q:v 3 "${thumb}"`);
      if (fileOk(thumb)) await setThumbnail(up.id, thumb);
    } catch (e) {
      console.warn('Thumbnail pulada: ' + e.message);
    }

    // Comentário
    try {
      const reviewUrl = `${BASE}/review/${slug}`;
      const product = job.product || script.title || slug;
      const commentText = `📝 Review completo do ${product} com preço atualizado e oferta aqui: ${reviewUrl}`;
      await postReviewComment(up.id, commentText);
    } catch {}

    // Marcar como publicado
    await sb
      .from('video_jobs')
      .update({ status: 'published', youtube_video_id: up.id, youtube_url: up.url, error: null })
      .eq('slug', slug);

    console.log(`✓ Publicado → ${up.url}`);

    // Limpar arquivos temporários
    for (const f of [txt, mp3, mp4, srt, thumb]) {
      try { if (f && existsSync(f)) rmSync(f); } catch {}
    }

    return 'ok';
  } catch (e) {
    console.error(`✗ Falhou ${slug}: ${e.message}`);
    await sb.from('video_jobs').update({ status: 'failed', error: String(e.message).slice(0, 500) }).eq('slug', slug);
    return 'failed';
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log(`[Remotion Batch] Buscando até ${BATCH_SIZE} jobs...`);

// Buscar jobs pendentes
let jobs = [];
for (let attempt = 0; attempt < 2; attempt++) {
  const { data } = await sb
    .from('video_jobs')
    .select('*')
    .eq('status', 'script_ready')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  jobs = data || [];
  console.log(`[Remotion Batch] Pendentes (tentativa ${attempt + 1}): ${jobs.length}`);
  if (jobs.length) break;
  if (attempt === 0) await new Promise(r => setTimeout(r, 5000));
}

if (!jobs.length) {
  console.log('[Remotion Batch] Nada a fazer.');
  process.exit(0);
}

// Processar cada job sequencialmente
let ok = 0, failed = 0, skipped = 0;
for (const job of jobs) {
  const result = await renderJob(job);
  if (result === 'ok') ok++;
  else if (result === 'failed') failed++;
  else skipped++;
}

console.log(`\n[Remotion Batch] Fim: ${ok} publicados, ${skipped} pulados, ${failed} falhas.`);
process.exit(failed ? 1 : 0);
