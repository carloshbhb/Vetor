// Worker Remotion: renderiza 1 vídeo premium/dia com animações React
// Busca 1 job com render_engine='remotion' → edge-tts → conversor → Remotion render → YouTube
// Uso: node scripts/remotion-worker.mjs
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
const { processLongFormJob } = await import('./video-longform.mjs');

// ── Main ────────────────────────────────────────────────────────────────────
console.log('[Remotion Worker] Buscando 1 job premium...');

const { data: job } = await sb
  .from('video_jobs')
  .select('*')
  .eq('render_engine', 'remotion')
  .eq('status', 'script_ready')
  .order('created_at', { ascending: true })
  .limit(1)
  .maybeSingle();

if (!job) {
  console.log('[Remotion Worker] Nenhum job premium pendente.');
  process.exit(0);
}

const slug = job.slug;
const script = job.script || {};
console.log(`[Remotion Worker] Processando: ${slug}`);

try {
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
    console.log('[Remotion Worker] Job já assumido por outro runner.');
    process.exit(0);
  }

  // Anti-duplicado
  if (job.youtube_video_id) {
    await sb
      .from('video_jobs')
      .update({ status: 'published', error: null })
      .eq('slug', slug);
    console.log(`[Remotion Worker] Já tem vídeo (${job.youtube_video_id}), pulando.`);
    process.exit(0);
  }

  const tmp = os.tmpdir();
  const txt = path.join(tmp, `${slug}.txt`);
  const mp3 = path.join(tmp, `${slug}.mp3`);
  const mp4 = path.join(tmp, `${slug}.mp4`);
  const srt = path.join(tmp, `${slug}.srt`);
  const thumb = path.join(tmp, `${slug}.thumb.jpg`);

  // ── 1. Gerar áudio com edge-tts ──────────────────────────────────────────
  console.log('[1/5] Gerando áudio...');
  writeFileSync(txt, script.fullNarration || '', 'utf8');
  try {
    run(
      `edge-tts --voice ${TTS_VOICE} --file "${txt}" --write-media "${mp3}" --write-subtitles "${srt}"`
    );
  } catch (e) {
    console.warn('edge-tts com legendas falhou, tentando python -m edge_tts:', e.message?.slice(0, 120));
    run(
      `python -m edge_tts --voice ${TTS_VOICE} --file "${txt}" --write-media "${mp3}" --write-subtitles "${srt}"`
    );
  }
  if (!existsSync(mp3)) throw new Error(`TTS falhou: ${slug}.mp3 ausente`);

  // ── 2. Preparar áudio para Remotion ────────────────────────────────────
  console.log('[2/5] Preparando áudio...');
  const audioDir = path.join(REMOTION_DIR, 'public', 'audio');
  if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });
  copyFileSync(mp3, path.join(audioDir, 'full.mp3'));

  // ── 3. Converter VideoScript → video-data.json ───────────────────────────
  console.log('[3/5] Convertendo roteiro...');
  // Busca dados do review
  let reviewData = {};
  try {
    const { data: rev, error: revErr } = await sb
      .from('reviews')
      .select('image_url, meta_og_image, affiliate_url, hero_lead, hero_overall_score, verdict_score, verdict_label, testimonials')
      .eq('slug', slug)
      .single();
    if (revErr) {
      console.warn('[Remotion Worker] Review query error:', revErr.message);
    } else {
      reviewData = rev || {};
    }
  } catch (e) {
    console.warn('[Remotion Worker] Review fetch failed:', e.message);
  }

  const isLongForm = (script.estimatedSeconds || 0) > 60;
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
  console.log(`[3/5] ${isLongForm ? 'Long-form horizontal' : 'Short-form vertical'} - ${remotionData.meta.duration}s, ${remotionData.meta.resolution.width}x${remotionData.meta.resolution.height}`);

  // ── 3b. Baixar imagens para public/images/ (evita CORS/ORB no Chrome headless) ──
  console.log('[3b/5] Baixando imagens...');
  const imagesDir = path.join(REMOTION_DIR, 'public', 'images');
  if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });

  // Coleta todas as URLs de imagem únicas do video-data
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

  // Mapeia URL → caminho local
  const urlToLocal = {};
  let imgIdx = 0;
  for (const url of allImageUrls) {
    const ext = url.includes('.webp') ? '.webp' : url.includes('.png') ? '.png' : '.jpg';
    const localName = `${slug}-${imgIdx++}${ext}`;
    const localPath = path.join(imagesDir, localName);
    const publicPath = `images/${localName}`;
    const ok = await downloadImage(url, localPath);
    if (ok) {
      urlToLocal[url] = publicPath;
      console.log(`  ✓ ${localName}`);
    } else {
      console.warn(`  ✗ Falhou: ${url.slice(0, 80)}`);
    }
  }

  // Substitui URLs remotas por caminhos locais no video-data
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

  // Salvar video-data.json no diretório Remotion
  writeFileSync(
    path.join(REMOTION_DIR, 'video-data.json'),
    JSON.stringify(remotionData, null, 2),
    'utf8'
  );

  console.log(`[3/5] Review image: ${remotionData.meta.productImage ? '✓ ' + remotionData.meta.productImage.slice(0, 80) : '✗ empty'}`);

  // ── 3c. Gerar QR code como PNG estático (obrigatório p/ ShortVideo/LongVideo) ──
  console.log('[3c/5] Gerando QR code...');
  const QRCode = await import('qrcode');
  const qrDir = path.join(REMOTION_DIR, 'public');
  if (!existsSync(qrDir)) mkdirSync(qrDir, { recursive: true });
  const qrPath = path.join(qrDir, 'qr.png');
  const qrTarget = reviewData.affiliate_url || `${BASE}/review/${slug}`;
  if (qrTarget) {
    await QRCode.toFile(qrPath, qrTarget, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });
    console.log(`  QR code salvo: ${qrPath}`);
  } else {
    console.warn('  Sem URL, QR code não gerado');
  }

// ── 4. Renderizar com Remotion ───────────────────────────────────────────
  const outDir = path.join(REMOTION_DIR, 'out');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${slug}.mp4`);

  // Pular render se vídeo já existe
  if (existsSync(outputPath)) {
    const stat = statSync(outputPath);
    console.log(`[4/5] Vídeo já existe (${(stat.size / 1024 / 1024).toFixed(1)} MB), pulando render...`);
  } else {
    // Check if Lambda is available for faster rendering
    const useLambda = process.env.REMOTION_LAMBDA_FUNCTION && process.env.AWS_REGION;
    
    if (useLambda) {
      console.log('[4/5] Renderizando via Lambda (batch)...');
      try {
        const { renderOnLambda } = await import('../remotion/src/utils/lambda-render.ts');
        const result = await renderOnLambda({
          id: slug,
          composition: isLongForm ? 'LongVideo' : 'ShortVideo',
          videoData: remotionData,
          outputBucket: process.env.AWS_S3_BUCKET || 'vetor-blog-videos',
          outputKey: `renders/${slug}.mp4`,
        });
        
        if (result.success) {
          console.log(`[4/5] Lambda render concluído em ${result.durationMs}ms`);
          // Download from S3 to local
          if (result.s3Url) {
            run(`aws s3 cp "${result.s3Url}" "${outputPath}"`);
          }
        } else {
          throw new Error(`Lambda render failed: ${result.error}`);
        }
      } catch (lambdaErr) {
        console.warn('[4/5] Lambda falhou, fallback para local:', lambdaErr.message);
        // Fall through to local render
      }
    }
    
    // Local render (fallback or if Lambda not configured)
    if (!existsSync(outputPath)) {
      console.log('[4/5] Renderizando com Remotion (local)...');
      const renderComponent = isLongForm ? 'LongVideo' : 'ShortVideo';

      // Instalar deps do Remotion se necessário
      if (!existsSync(path.join(REMOTION_DIR, 'node_modules'))) {
        console.log('[Remotion Worker] Instalando dependências do Remotion...');
        run('npm install --no-audit --no-fund', { cwd: REMOTION_DIR });
      }

      try {
        run('npx remotion browser ensure', { cwd: REMOTION_DIR });
      } catch (e) {
        console.warn('[Remotion Worker] Aviso browser ensure:', e.message);
      }

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
  }

  // ── 4.1 Verificação visual (extrai stills em 10%/50%/90%) ────────────────
  console.log('[4.1/5] Verificando render...');
  const verificationDir = path.join(REMOTION_DIR, 'out', 'verification');
  if (!existsSync(verificationDir)) mkdirSync(verificationDir, { recursive: true });

  // Extrair stills para verificação visual
  const positions = [
    { label: '10pct', pct: 0.1 },
    { label: '50pct', pct: 0.5 },
    { label: '90pct', pct: 0.9 },
  ];

  // Obter duração do vídeo
  let videoDuration = 0;
  try {
    const probe = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`, { encoding: 'utf-8' });
    videoDuration = parseFloat(probe.trim());
  } catch (e) {
    console.warn('[Verify] Não foi possível obter duração:', e.message);
  }

  const verificationResults = [];
  for (const { label, pct } of positions) {
    const timestamp = videoDuration * pct;
    const framePath = path.join(verificationDir, `${slug}_${label}.jpg`);
    try {
      execSync(`ffmpeg -y -ss ${timestamp} -i "${outputPath}" -frames:v 1 -update 1 -q:v 3 "${framePath}"`, { stdio: 'pipe' });
      const size = existsSync(framePath) ? statSync(framePath).size : 0;
      verificationResults.push({ position: `${Math.round(pct * 100)}%`, exists: size > 5000, sizeBytes: size });
      console.log(`  ${Math.round(pct * 100)}%: ${size > 5000 ? '✓' : '✗'} (${size} bytes)`);
    } catch (e) {
      verificationResults.push({ position: `${Math.round(pct * 100)}%`, exists: false, sizeBytes: 0 });
      console.log(`  ${Math.round(pct * 100)}%: ✗ (falha ao extrair)`);
    }
  }

  // Verificar se há problemas
  const failedFrames = verificationResults.filter(r => !r.exists || r.sizeBytes < 5000);
  if (failedFrames.length > 0) {
    console.warn(`[Verify] ⚠ ${failedFrames.length} frame(s) com problema (possível frame preto)`);
  } else {
    console.log('[Verify] ✓ Todos os frames OK');
  }

  // ── 5. Upload para YouTube ───────────────────────────────────────────────
  console.log('[5/5] Subindo ao YouTube...');
  const affiliateUrl = reviewData.affiliate_url || `${BASE}/review/${slug}`;
  const description =
    `${script.description || ''}` +
    (affiliateUrl ? `\n\n🛒 Ver oferta: ${affiliateUrl}` : '') +
    `\n📝 Review completo: ${BASE}/review/${slug}`;

  const up = await uploadToYoutube(outputPath, {
    title: script.title,
    description,
    tags: script.tags,
    privacy: PRIVACY,
  });

  // Thumbnail
  try {
    run(
      `ffmpeg -y -ss 00:00:10 -i "${outputPath}" -frames:v 1 -q:v 3 "${thumb}"`
    );
    await setThumbnail(up.id, thumb);
    console.log('Thumbnail aplicada.');
  } catch (e) {
    console.warn('Thumbnail pulada: ' + e.message);
  }

  // Comentário com link do review
  try {
    const reviewUrl = `${BASE}/review/${slug}`;
    const product = job.product || script.title || slug;
    const commentText = `📝 Review completo do ${product} com preço atualizado e oferta aqui: ${reviewUrl}`;
    const commentId = await postReviewComment(up.id, commentText);
    console.log('Comentário criado → ' + (commentId || 'ok'));
  } catch (e) {
    console.warn('Comentário pulado: ' + e.message);
  }

  // Marcar como publicado
  await sb
    .from('video_jobs')
    .update({
      status: 'published',
      youtube_video_id: up.id,
      youtube_url: up.url,
      error: null,
    })
    .eq('slug', slug);

  console.log(`[Remotion Worker] Publicado → ${up.url}`);
} catch (e) {
  console.error(`[Remotion Worker] Falhou ${slug}: ${e.message}`);
  await sb
    .from('video_jobs')
    .update({
      status: 'failed',
      error: String(e.message).slice(0, 500),
    })
    .eq('slug', slug);
  process.exit(1);
}
