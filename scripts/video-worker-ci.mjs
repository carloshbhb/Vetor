// Worker CI 100% ONLINE (GitHub Actions, grátis, sem PC).
// Faz tudo no runner: busca jobs script_ready → edge-tts → ffmpeg com carrossel de imagens → upload YouTube (+ thumbnail + comentário com link do review) → marca published.
// Uso local (opcional): SITE_BASE=https://www.vetor.blog node scripts/video-worker-ci.mjs
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');
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
const LIMIT = Math.min(Number(process.env.VIDEO_LIMIT || 30), 30);
const PRIVACY = process.env.YOUTUBE_PRIVACY || 'public';

const run = (cmd) => { console.log('> ' + cmd); execSync(cmd, { stdio: 'inherit' }); };

// Shell-safe escaping: wraps value in single quotes, escaping any inner single quotes
const shellEscape = (s) => "'" + String(s || '').replace(/'/g, "'\\''") + "'";

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { OAuth2Client } = await import('google-auth-library');
const youtubeOAuth = new OAuth2Client(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost');
youtubeOAuth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

async function getYoutubeToken() {
  const { token } = await youtubeOAuth.getAccessToken();
  if (!token) throw new Error('Sem access_token YouTube (verifique Secrets)');
  return token;
}

async function uploadToYoutube(videoPath, { title, description, tags }) {
  const token = await getYoutubeToken();
  const buf = readFileSync(videoPath);
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(buf.length),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify({
      snippet: { title: title.slice(0, 100), description: description.slice(0, 5000), tags: (tags || []).slice(0, 15), categoryId: '22' },
      status: { privacyStatus: PRIVACY, madeForKids: false, selfDeclaredMadeForKids: false },
    }),
  });
  if (!init.ok) throw new Error(`YouTube init: ${init.status} ${await init.text()}`);
  const url = init.headers.get('location');
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Length': String(buf.length), 'Content-Type': 'video/mp4' }, body: buf });
  if (!put.ok) throw new Error(`YouTube upload: ${put.status} ${await put.text()}`);
  const data = await put.json();
  return { id: data.id, url: `https://youtu.be/${data.id}` };
}

async function setThumbnail(videoId, thumbPath) {
  const token = await getYoutubeToken();
  const buf = readFileSync(thumbPath);
  const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg', 'Content-Length': String(buf.length) },
    body: buf,
  });
  if (!res.ok) throw new Error(`thumbnail: ${res.status} ${await res.text()}`);
}

async function postReviewComment(videoId, text) {
  const token = await getYoutubeToken();

  const initRes = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: {
        videoId,
        topLevelComment: {
          snippet: { textOriginal: text }
        }
      }
    }),
  });
  if (!initRes.ok) {
    const errTxt = await initRes.text();
    // 403 = escopo insuficiente (token sem youtube.force-ssl) ou comentários desativados
    throw new Error(`comment create: ${initRes.status} ${errTxt.slice(0, 300)}`);
  }
  const commentData = await initRes.json();
  return commentData?.id || null;
}

async function downloadImage(url, dest) {
  try {
    // User-Agent de browser: CDNs (ex.: Mercado Livre) bloqueiam requests sem UA
    const img = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'image/*,*/*',
      },
    });
    if (!img.ok) return false;
    const buf = Buffer.from(await img.arrayBuffer());
    // Rejeita placeholder/página de erro (pequena demais p/ ser foto real)
    if (buf.length < 2048) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {}
  return false;
}

async function buildCarouselVideo(scenes, tmp, mp4, total, audioPath) {
  // Windows: copiar fonte para ./tmp sem ":" para evitar escaping do ffmpeg
  let fontOpt = '';
  try {
    const winFont = 'C:\\Windows\\Fonts\\arialbd.ttf';
    if (process.platform==='win32' && existsSync(winFont)) {
      const projTmp = path.join(process.cwd(),'tmp');
      if (!existsSync(projTmp)) mkdirSync(projTmp,{recursive:true});
      const tmpFont = path.join(projTmp,'winfont.ttf');
      if (!existsSync(tmpFont)) { const {copyFileSync}=await import('node:fs'); copyFileSync(winFont, tmpFont); }
      fontOpt = `:fontfile=tmp/winfont.ttf`;
    } else {
      const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
      fontOpt = existsSync(FONT) ? `:fontfile=${FONT}` : '';
    }
  } catch { fontOpt=''; }
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/,/g, '\\,').slice(0, 60);

  // Baixa todas as imagens de todas as cenas
  const allImagePaths = [];
  for (let i = 0; i < scenes.length; i++) {
    const sceneImages = scenes[i]?.images || [];
    const scenePath = path.join(tmp, `scene_${i}`);
    if (!existsSync(scenePath)) mkdirSync(scenePath, { recursive: true });
    for (let j = 0; j < sceneImages.length; j++) {
      const imgPath = path.join(scenePath, `img_${j}.jpg`);
      const downloaded = await downloadImage(sceneImages[j], imgPath);
      if (downloaded) allImagePaths.push(imgPath);
    }
  }

  if (allImagePaths.length < 2) return false;

  // Cria playlist para concat
    const listFile = path.join(tmp, 'image_list.txt');
  const imgDuration = total / allImagePaths.length;
  const listContent = allImagePaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'\n duration ${imgDuration}`).join('');
  writeFileSync(listFile, listContent);

  const hook = esc(scenes[0]?.onScreenText || '');
  const priceLine = esc([scenes.flatMap((s) => s.onScreenText || []).filter(Boolean).join(' ')]);
  const ctaLine = esc(scenes[scenes.length - 1]?.onScreenText || '');
  const priceStart = Math.max(0, total - 7);

  let vf = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
  if (hook) vf += `,drawtext=text='${hook}'${fontOpt}:fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h*0.30:box=1:boxcolor=black@0.6:boxborderw=24:enable='lte(t\\,5)'`;
  if (priceLine) vf += `,drawtext=text='${priceLine}'${fontOpt}:fontcolor=yellow:fontsize=72:x=(w-text_w)/2:y=h*0.62:box=1:boxcolor=red@0.85:boxborderw=28:enable='gte(t\\,${priceStart})'`;
  if (ctaLine) vf += `,drawtext=text='${ctaLine}'${fontOpt}:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h*0.72:box=1:boxcolor=black@0.6:boxborderw=20:enable='gte(t\\,${priceStart})'`;
  vf += ',fps=25';

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -i "${audioPath}" -filter_complex "[0:v]${vf}[v]" -map "[v]" -map 1:a -t ${total} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${mp4}"`;

  try {
    run(cmd);
    return true;
  } catch (e) {
    console.warn('Carousel failed:', e.message.slice(0, 100));
    return false;
  }
}

// 1. Garante roteiros do dia em lotes maiores (até 10 por chamada)
console.log(`[1/3] Gerando fila via ${BASE}/api/cron/video-queue ...`);
const BATCH = Math.min(Math.max(Number(process.env.VIDEO_BATCH || 10), 1), 10);
const seenSlugs = new Set();
for (let i = 0; i < Math.ceil(LIMIT / BATCH); i++) {
  try {
    const q = await fetch(`${BASE}/api/cron/video-queue?token=${process.env.CRON_SECRET}&batch=${BATCH}`);
    const qtxt = await q.text();
    console.log(`queue lote ${i + 1}:`, qtxt.slice(0, 300));
    const parsed = JSON.parse(qtxt);
    const newSlugs = (parsed?.jobs || []).map((j) => j.slug).filter((s) => !seenSlugs.has(s));
    if (!newSlugs.length) break;
    newSlugs.forEach((s) => seenSlugs.add(s));
  } catch (e) { console.warn('queue falhou (segue com pendentes):', e.message); break; }
}

// 2. Busca pendentes (com retry se a primeira query voltar vazia)
let jobs = [];
for (let attempt = 0; attempt < 2; attempt++) {
  const { data } = await sb.from('video_jobs').select('*').in('status', ['script_ready', 'ready_mp4']).order('created_at').limit(LIMIT);
  jobs = data || [];
  console.log(`[2/3] Pendentes (tentativa ${attempt + 1}): ${jobs.length}`);
  if (jobs.length) break;
  // Espera 5s antes de retry (script pode estar sendo criado pela queue)
  if (attempt === 0) await new Promise(r => setTimeout(r, 5000));
}
if (!jobs.length) { console.log('Nada a fazer.'); process.exit(0); }

let ok = 0;
let failed = 0;
let skipped = 0;
for (const job of jobs) {
  const slug = job.slug;
  const script = job.script || {};
  console.log(`\n═══ ${slug} ═══`);
  const tmp = os.tmpdir();
  const txt = path.join(tmp, `${slug}.txt`);
  const mp3 = path.join(tmp, `${slug}.mp3`);
  const mp4 = path.join(tmp, `${slug}.mp4`);
  const audioBackup = path.join(tmp, `${slug}_audio.mp3`);
  try {
    // Claim atômico: só assume o job se ele AINDA estiver pendente.
    // Evita 2 runners (agendado + manual) renderizando o mesmo slug ao mesmo tempo.
    const { data: claimed } = await sb.from('video_jobs')
      .update({ status: 'rendering', attempts: (job.attempts || 0) + 1, updated_at: new Date().toISOString() })
      .in('status', ['script_ready', 'ready_mp4'])
      .eq('slug', slug)
      .select('slug');
    if (!claimed?.length) { console.log('Job já assumido por outro runner, pulando.'); skipped++; continue; }
    // Trava anti-duplicado: se já existe vídeo no YouTube p/ este slug,
    // não re-envia — só garante status published e pula.
    if (job.youtube_video_id) {
      await sb.from('video_jobs').update({ status: 'published', error: null }).eq('slug', slug);
      console.log(`Já tem vídeo (${job.youtube_video_id}), upload pulado.`);
      skipped++;
      continue;
    }
    const total = script.estimatedSeconds || 50;
    writeFileSync(txt, script.fullNarration || '', 'utf8');
    const srt = path.join(tmp, `${slug}.srt`);
    const thumb = path.join(tmp, `${slug}.thumb.jpg`);
    run(`edge-tts --voice pt-BR-AntonioNeural --file "${txt}" --write-media "${mp3}" --write-subtitles "${srt}"`);
    // Backup do áudio para fallback (compatível Windows)
    { const { copyFileSync } = await import('node:fs'); copyFileSync(mp3, audioBackup); }

    // Busca imagens das cenas
    let scenes = script.scenes || [];
    // Fallback: imagem do review (foto real do produto — sempre primeiro,
    // pois é a única URL verificada; as das cenas vêm da IA e podem falhar)
    let affiliateUrl = '';
    let reviewImageUrl = '';
    try {
      const { data: rev } = await sb.from('reviews').select('image_url,affiliate_url').eq('slug', slug).single();
      reviewImageUrl = rev?.image_url || '';
      affiliateUrl = rev?.affiliate_url || '';
    } catch {}
    let carouselImages = [];
    if (reviewImageUrl) carouselImages.push(reviewImageUrl);
    for (const scene of scenes) {
      if (scene?.images) {
        for (const imgUrl of scene.images) {
          if (imgUrl && !carouselImages.includes(imgUrl)) carouselImages.push(imgUrl);
        }
      }
    }

    // Baixa imagens para o carousel
    const downloadedImages = [];
    for (const imgUrl of carouselImages) {
      const imgPath = path.join(tmp, `${slug}_carousel_${downloadedImages.length}.jpg`);
      const downloaded = await downloadImage(imgUrl, imgPath);
      if (downloaded) downloadedImages.push(imgPath);
    }

    // Usa carrossel se tiver imagens, senão fallback para imagem única
    const hasCarousel = downloadedImages.length >= 2;
    let success = false;

    if (hasCarousel) {
      // Cria vídeo com carrossel de imagens
      const audioPath = path.join(tmp, `audio_${slug}.mp3`);
      { const { copyFileSync } = await import('node:fs'); copyFileSync(mp3, audioPath); }
      success = await buildCarouselVideo(scenes, tmp, mp4, total, audioPath);
    }

    if (!success) {
      // Fallback: imagem única (mesmo código antigo)
      const jpg = path.join(tmp, `${slug}.jpg`);
  const esc = (s) => String(s || '')
    .replace(/\\/g, '\\\\')   // FFmpeg: backslash
    .replace(/%/g, '%%')      // FFmpeg: percent (format specifier)
    .replace(/\$/g, '\\$')    // Shell: dollar sign
    .replace(/`/g, '\\`')     // Shell: backtick
    .replace(/:/g, '\\:')     // FFmpeg: colon
    .replace(/'/g, "\\'")     // FFmpeg + Shell: single quote
    .replace(/,/g, '\\,')     // FFmpeg: comma
    .slice(0, 60);
      const hook = esc(script.scenes?.[0]?.onScreenText || script.hook);
      const priceLine = esc([script.offerBadge, script.priceHighlight].filter(Boolean).join(' '));
      const ctaLine = esc(script.finalCta);
      const priceStart = Math.max(0, total - 7);
      // lavfi color é stream infinito: sem -loop (opção inválida p/ lavfi, quebra o ffmpeg)
      const inputImg = downloadedImages.length > 0 ? `-loop 1 -i "${downloadedImages[0]}"` : `-f lavfi -i "color=c=0x0b1220:s=1080x1920:r=25"`;
      let fontOpt='';
      try {
        const winFont2='C:\\Windows\\Fonts\\arialbd.ttf';
        if (process.platform==='win32' && existsSync(winFont2)) {
          const projTmp2=path.join(process.cwd(),'tmp');
          if (!existsSync(projTmp2)) mkdirSync(projTmp2,{recursive:true});
          const tmpFont2=path.join(projTmp2,'winfont2.ttf');
          if (!existsSync(tmpFont2)) { const {copyFileSync}=await import('node:fs'); copyFileSync(winFont2, tmpFont2); }
          fontOpt=`:fontfile=tmp/winfont2.ttf`;
        } else {
          const FONT2='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
          fontOpt=existsSync(FONT2)?`:fontfile=${FONT2}`:'';
        }
      } catch { fontOpt=''; }
      let vf = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
      // Sem foto: nome do produto em destaque no centro (nunca fundo preto puro)
      const noPhoto = downloadedImages.length === 0;
      if (noPhoto) {
        const productLine = esc(job.product || script.title || slug).slice(0, 40);
        if (productLine) vf += `,drawtext=text='${productLine}'${fontOpt}:fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.6:boxborderw=24`;
      }
      if (hook) vf += `,drawtext=text='${hook}'${fontOpt}:fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h*0.30:box=1:boxcolor=black@0.6:boxborderw=24:enable='lte(t\\,5)'`;
      if (priceLine) vf += `,drawtext=text='${priceLine}'${fontOpt}:fontcolor=yellow:fontsize=72:x=(w-text_w)/2:y=h*0.62:box=1:boxcolor=red@0.85:boxborderw=28:enable='gte(t\\,${priceStart})'`;
      if (ctaLine) vf += `,drawtext=text='${ctaLine}'${fontOpt}:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h*0.72:box=1:boxcolor=black@0.6:boxborderw=20:enable='gte(t\\,${priceStart})'`;
      // Windows: evitar subtitles com fontconfig que falha; usar só se ffmpeg compilar com libass e fonte disponível. Desativa temporariamente em Windows para não quebrar
      const isWin = process.platform === 'win32';
      if (existsSync(srt) && !isWin) { const srtEsc = srt.replace(/\\/g,'/').replace(/:/g,'\\:'); vf += `,subtitles='${srtEsc}':force_style='FontName=DejaVu Sans,FontSize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=250'`; }
      run(`ffmpeg -y ${inputImg} -i "${mp3}" -filter_complex "[0:v]${vf}[v]" -map "[v]" -map 1:a -t ${total} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${mp4}"`);
    }

    // 3. Upload direto → YouTube
    console.log('[3/3] Subindo ao YouTube...');
    const siteUrl = BASE;
    const description =
      `${script.description || ''}` +
      (affiliateUrl ? `\n\n🛒 Ver oferta: ${affiliateUrl}` : '') +
      `\n📝 Review completo: ${siteUrl}/review/${slug}`;
    const up = await uploadToYoutube(mp4, { title: script.title, description, tags: script.tags });
    try {
      run(`ffmpeg -y -ss ${Math.floor(total / 2)} -i "${mp4}" -frames:v 1 -q:v 3 "${thumb}"`);
      await setThumbnail(up.id, thumb);
      console.log('Thumbnail aplicada.');
    } catch (e) { console.warn('Thumbnail pulada: ' + e.message); }
    await sb.from('video_jobs').update({ status: 'published', youtube_video_id: up.id, youtube_url: up.url, error: null }).eq('slug', slug);
    console.log('Publicado → ' + up.url);
    // 4. Comentário com link do review (para fixar depois no YouTube Studio)
    try {
      const siteUrl = BASE;
      const reviewUrl = `${siteUrl}/review/${slug}`;
      const product = job.product || script.title || slug;
      const commentText = `📝 Review completo do ${product} com preço atualizado e oferta aqui: ${reviewUrl}`;
      const commentId = await postReviewComment(up.id, commentText);
      console.log('Comentário criado → ' + (commentId || 'ok') + ' (fixe manualmente no YouTube Studio)');
    } catch (e) { console.warn('Comentário pulado: ' + e.message); }
    // Limpa arquivos temporários deste job
    for (const f of [txt, mp3, mp4, srt, thumb, audioBackup, jpg, listFile]) {
      try { if (existsSync(f)) rmSync(f); } catch {}
    }
    // Limpa diretórios de cenas e imagens do carousel
    for (let ci = 0; ci < 20; ci++) {
      const sp = path.join(tmp, `scene_${ci}`);
      try { if (existsSync(sp)) rmSync(sp, { recursive: true }); } catch {}
    }
    for (let ci = 0; ci < 20; ci++) {
      const cp = path.join(tmp, `${slug}_carousel_${ci}.jpg`);
      try { if (existsSync(cp)) rmSync(cp); } catch {}
    }
    ok++;
  } catch (e) {
    console.error('Falhou ' + slug + ': ' + e.message);
    failed++;
    await sb.from('video_jobs').update({ status: 'failed', error: String(e.message).slice(0, 500) }).eq('slug', slug);
  }
}
console.log(`\nFim: ${ok} publicados, ${skipped} pulados, ${failed} falhas (${jobs.length} pendentes).`);
// Exit 1 só se houve falha real; pulos (anti-duplicado) não são erro
process.exit(failed ? 1 : 0);
