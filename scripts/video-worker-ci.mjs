// Worker CI 100% ONLINE (GitHub Actions, grátis, sem PC).
// Faz tudo no runner: busca jobs script_ready → edge-tts → ffmpeg com carrossel de imagens → upload YouTube (+ thumbnail + comentário com link do review) → marca published.
// Uso local (opcional): SITE_BASE=https://www.vetor.blog node scripts/video-worker-ci.mjs
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
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

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { OAuth2Client } = await import('google-auth-library');
async function uploadToYoutube(videoPath, { title, description, tags }) {
  const oauth = new OAuth2Client(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost');
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error('Sem access_token YouTube (verifique Secrets)');
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
  const oauth = new OAuth2Client(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost');
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  const buf = readFileSync(thumbPath);
  const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg', 'Content-Length': String(buf.length) },
    body: buf,
  });
  if (!res.ok) throw new Error(`thumbnail: ${res.status} ${await res.text()}`);
}

async function postReviewComment(videoId, text) {
  // Cria um comentário no vídeo com o link do review.
  // Limitação real da API: o YouTube Data API v3 NÃO tem endpoint de "fixar"
  // comentário — fixar só pelo YouTube Studio manual. Aqui criamos o comentário;
  // o fixar fica como passo manual (1 clique no Studio).
  const oauth = new OAuth2Client(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost');
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error('Sem access_token YouTube');

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
    const img = await fetch(url);
    if (img.ok) {
      writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
      return true;
    }
  } catch {}
  return false;
}

async function buildCarouselVideo(scenes, tmp, mp4, total, audioPath) {
  const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const fontOpt = existsSync(FONT) ? `:fontfile=${FONT}` : '';
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

// 1. Garante roteiros do dia
console.log(`[1/3] Gerando fila via ${BASE}/api/cron/video-queue ...`);
try {
  const q = await fetch(`${BASE}/api/cron/video-queue?token=${process.env.CRON_SECRET}&limit=${LIMIT}`);
  console.log('queue:', (await q.text()).slice(0, 300));
} catch (e) { console.warn('queue falhou (segue com pendentes):', e.message); }

// 2. Busca pendentes
const { data: jobs } = await sb.from('video_jobs').select('*').in('status', ['script_ready', 'ready_mp4']).order('created_at').limit(LIMIT);
console.log(`[2/3] Pendentes: ${jobs?.length || 0}`);
if (!jobs?.length) { console.log('Nada a fazer.'); process.exit(0); }

let ok = 0;
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
    await sb.from('video_jobs').update({ status: 'rendering', attempts: (job.attempts || 0) + 1 }).eq('slug', slug);
    const total = script.estimatedSeconds || 50;
    writeFileSync(txt, script.fullNarration || '', 'utf8');
    const srt = path.join(tmp, `${slug}.srt`);
    const thumb = path.join(tmp, `${slug}.thumb.jpg`);
    run(`edge-tts --voice pt-BR-AntonioNeural --file "${txt}" --write-media "${mp3}" --write-subtitles "${srt}"`);
    // Backup do áudio para fallback
    run(`cp "${mp3}" "${audioBackup}"`);

    // Busca imagens das cenas
    let scenes = script.scenes || [];
    let carouselImages = [];
    for (const scene of scenes) {
      if (scene?.images) {
        for (const imgUrl of scene.images) {
          if (imgUrl && !carouselImages.includes(imgUrl)) carouselImages.push(imgUrl);
        }
      }
    }
    // Fallback: imagem do review
    let affiliateUrl = '';
    try {
      const { data: rev } = await sb.from('reviews').select('image_url,affiliate_url').eq('slug', slug).single();
      const imgUrl = rev?.image_url;
      affiliateUrl = rev?.affiliate_url || '';
      if (imgUrl && carouselImages.length === 0) carouselImages.push(imgUrl);
    } catch {}

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
      run(`cp "${mp3}" "${audioPath}"`);
      success = await buildCarouselVideo(scenes, tmp, mp4, total, audioPath);
    }

    if (!success) {
      // Fallback: imagem única (mesmo código antigo)
      const jpg = path.join(tmp, `${slug}.jpg`);
      const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/,/g, '\\,').slice(0, 60);
      const hook = esc(script.scenes?.[0]?.onScreenText || script.hook);
      const priceLine = esc([script.offerBadge, script.priceHighlight].filter(Boolean).join(' '));
      const ctaLine = esc(script.finalCta);
      const priceStart = Math.max(0, total - 7);
      const inputImg = downloadedImages.length > 0 ? `-loop 1 -i "${downloadedImages[0]}"` : `-f lavfi -loop 1 -i "color=c=0x0b1220:s=1080x1920"`;
      const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
      const fontOpt = existsSync(FONT) ? `:fontfile=${FONT}` : '';
      let vf = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
      if (hook) vf += `,drawtext=text='${hook}'${fontOpt}:fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h*0.30:box=1:boxcolor=black@0.6:boxborderw=24:enable='lte(t\\,5)'`;
      if (priceLine) vf += `,drawtext=text='${priceLine}'${fontOpt}:fontcolor=yellow:fontsize=72:x=(w-text_w)/2:y=h*0.62:box=1:boxcolor=red@0.85:boxborderw=28:enable='gte(t\\,${priceStart})'`;
      if (ctaLine) vf += `,drawtext=text='${ctaLine}'${fontOpt}:fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h*0.72:box=1:boxcolor=black@0.6:boxborderw=20:enable='gte(t\\,${priceStart})'`;
      if (existsSync(srt)) vf += `,subtitles='${srt}':force_style='FontName=DejaVu Sans,FontSize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=250'`;
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
    ok++;
  } catch (e) {
    console.error('Falhou ' + slug + ': ' + e.message);
    await sb.from('video_jobs').update({ status: 'failed', error: String(e.message).slice(0, 500) }).eq('slug', slug);
  }
}
console.log(`\nFim: ${ok}/${jobs.length} publicados.`);
process.exit(ok ? 0 : 1);
