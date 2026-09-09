import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
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
const DEFAULT_PRIVACY = process.env.YOUTUBE_PRIVACY || 'public';
const DEFAULT_DURATION = 120;
const FPS = 25;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    result[key] = next && !next.startsWith('--') ? next : true;
    if (result[key] !== true) i++;
  }
  return result;
}

function run(command, args = []) {
  console.log(`> ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', windowsHide: true });
}

function toPosixFilterPath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,');
}

function escapeDrawText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/;/g, '\\;')
    .slice(0, 500);
}

async function downloadImage(url, dest) {
  try {
    const parent = path.dirname(dest);
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
        Accept: 'image/*,*/*',
      },
    });
    if (!response.ok) return false;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 2048) return false;
    writeFileSync(dest, buffer);
    return true;
  } catch {
    return false;
  }
}

async function getJob(slug) {
  const { data, error } = await sb.from('video_jobs').select('*').eq('slug', slug).single();
  if (error) throw new Error(`Job não encontrado: ${slug} (${error.message})`);
  return data;
}

async function getReview(slug) {
  const { data, error } = await sb.from('reviews').select('image_url,meta_og_image,affiliate_url,product,price_new,price_old,hero_overall_score,verdict_score,verdict_label,specs,pros,cons,sections').eq('slug', slug).maybeSingle();
  if (error) console.warn(`Review não carregada: ${error.message}`);
  return data || {};
}

function buildLongNarration(script, review) {
  const scenes = Array.isArray(script.scenes) ? script.scenes : [];
  const body = scenes.map((scene) => scene.narration || '').filter(Boolean).join(' ');
  const extra = [
    ...(Array.isArray(review.pros) ? review.pros : []),
    ...(Array.isArray(review.cons) ? review.cons : []),
  ].join(' ');
  const base = script.fullNarration || body || script.hook || script.cta || script.title || '';
  return `${base}\n\n${extra}`.replace(/\s+/g, ' ').trim();
}

function normalizeScenes(scenes, duration) {
  const source = Array.isArray(scenes) && scenes.length ? scenes : [{
    narration: '',
    onScreenText: '',
    durationSec: duration,
  }];
  const rawDurations = source.map((scene) => Math.max(1, Number(scene.durationSec) || duration / source.length));
  const total = rawDurations.reduce((sum, value) => sum + value, 0);
  const scale = duration / total;
  const result = [];
  let cursor = 0;
  source.forEach((scene, index) => {
    const rawDuration = rawDurations[index];
    const end = index === source.length - 1 ? duration : Math.min(duration, cursor + rawDuration * scale);
    result.push({
      ...scene,
      startSec: cursor,
      endSec: end,
      durationSec: end - cursor,
    });
    cursor = end;
  });
  return result;
}

function makeFontPath() {
  const candidates = process.platform === 'win32'
    ? ['C:\\Windows\\Fonts\\arialbd.ttf', 'C:\\Windows\\Fonts\\calibri.ttf']
    : ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf'];
  return candidates.find((candidate) => existsSync(candidate)) || '';
}

function addTextFilter(filters, { text, file, font, x, y, fontSize, color, boxColor, boxOpacity, boxBorder, enable, align = 'center' }) {
  if (!text) return;
  writeFileSync(file, text, 'utf8');
  filters.push(
    `drawtext=textfile='${toPosixFilterPath(file)}':fontfile='${toPosixFilterPath(font)}':fontcolor=${color}:fontsize=${fontSize}:x=${x}:y=${y}:box=1:boxcolor=${boxColor}@${boxOpacity}:boxborderw=${boxBorder}:enable='between(t\\,${enable.start}\\,${enable.end})'`
  );
}

async function renderVideo({ job, review, tmp, audioPath, output, duration, image }) {
  const script = job.script || {};
  const scenes = normalizeScenes(script.scenes || [], duration);
  const font = makeFontPath();
  const filters = [];

  if (image) {
    filters.push('scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080');
  } else {
    filters.push('color=c=0x0b1220:s=1920x1080:r=25');
  }
  filters.push('eq=contrast=1.12:brightness=0.02:saturation=1.08');
  if (image) {
    filters.push(`zoompan=z='min(1.3,zoom+0.0003)':d=${duration * FPS}:s=1920x1080:fps=${FPS}`);
  }
  filters.push('fade=t=in:st=0:d=1');
  filters.push(`fade=t=out:st=${Math.max(0, duration - 1)}:d=1`);
  filters.push('drawbox=x=0:y=0:w=iw:h=170:color=0x000000@0.38:t=fill');
  filters.push('drawbox=x=0:y=ih-190:w=iw:h=190:color=0x000000@0.58:t=fill');

  scenes.forEach((scene, index) => {
    const prefix = `${slugSafe(job.slug)}_scene_${index}`;
    const titleFile = path.join(tmp, `${prefix}_title.txt`);
    const captionFile = path.join(tmp, `${prefix}_caption.txt`);
    const title = scene.onScreenText || script.hook || '';
    const caption = (scene.narration || '').slice(0, 180);
    addTextFilter(filters, {
      text: title,
      file: titleFile,
      font,
      x: '(w-text_w)/2',
      y: 'h*0.24',
      fontSize: title ? 64 : 0,
      color: 'white',
      boxColor: '0x000000',
      boxOpacity: '0.55',
      boxBorder: 18,
      enable: { start: scene.startSec, end: scene.endSec },
    });
    addTextFilter(filters, {
      text: caption,
      file: captionFile,
      font,
      x: '(w-text_w)/2',
      y: 'h*0.88',
      fontSize: caption ? 30 : 0,
      color: 'white',
      boxColor: '0x000000',
      boxOpacity: '0.62',
      boxBorder: 12,
      enable: { start: scene.startSec, end: scene.endSec },
    });
  });

  const price = script.priceHighlight || (review.price_new ? `Preço: ${review.price_new}` : '');
  const priceStart = Math.max(0, duration - 25);
  const cta = script.finalCta || 'Confira o review completo no link da descrição';
  const ctaStart = Math.max(0, duration - 18);
  const verdict = review.verdict_label || '';
  const verdictStart = Math.max(0, duration - 12);
  const textDir = path.join(tmp, 'longform-text');
  if (!existsSync(textDir)) mkdirSync(textDir, { recursive: true });
  addTextFilter(filters, {
    text: price,
    file: path.join(textDir, 'price.txt'),
    font,
    x: '(w-text_w)/2',
    y: 'h*0.57',
    fontSize: price ? 62 : 0,
    color: 'yellow',
    boxColor: '0x000000',
    boxOpacity: '0.72',
    boxBorder: 16,
    enable: { start: priceStart, end: duration },
  });
  addTextFilter(filters, {
    text: cta,
    file: path.join(textDir, 'cta.txt'),
    font,
    x: '(w-text_w)/2',
    y: 'h*0.74',
    fontSize: cta ? 46 : 0,
    color: 'white',
    boxColor: '0x000000',
    boxOpacity: '0.62',
    boxBorder: 16,
    enable: { start: ctaStart, end: duration },
  });
  addTextFilter(filters, {
    text: verdict,
    file: path.join(textDir, 'verdict.txt'),
    font,
    x: '(w-text_w)/2',
    y: 'h*0.38',
    fontSize: verdict ? 42 : 0,
    color: '#7CFC98',
    boxColor: '0x000000',
    boxOpacity: '0.65',
    boxBorder: 14,
    enable: { start: verdictStart, end: duration },
  });

  filters.push('fps=25');
  const videoFilter = `[0:v]${filters.join(',')}[v]`;
  const audioFilter = `[1:a]atrim=0:${duration},apad=pad_dur=${duration},volume=0.9[a]`;
  const inputArgs = image
    ? ['-loop', '1', '-framerate', String(FPS), '-i', image]
    : ['-f', 'lavfi', '-i', `color=c=0x0b1220:s=1920x1080:r=${FPS}`];
  const args = [
    '-y',
    ...inputArgs,
    '-stream_loop', '-1',
    '-i', audioPath,
    '-filter_complex', `${videoFilter};${audioFilter}`,
    '-map', '[v]',
    '-map', '[a]',
    '-t', String(duration),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    output,
  ];
  run('ffmpeg', args);
}

function slugSafe(slug) {
  return String(slug || 'video').replace(/[^a-zA-Z0-9_-]+/g, '-');
}

async function uploadToYoutube(videoPath, metadata) {
  const { OAuth2Client } = await import('google-auth-library');
  const oauth = new OAuth2Client(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost');
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error('Sem access_token do YouTube');
  const buffer = readFileSync(videoPath);
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(buffer.length),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify({
      snippet: {
        title: String(metadata.title || '').slice(0, 100),
        description: String(metadata.description || '').slice(0, 5000),
        tags: (metadata.tags || []).slice(0, 15),
        categoryId: '22',
      },
      status: { privacyStatus: metadata.privacy, madeForKids: false, selfDeclaredMadeForKids: false },
    }),
  });
  if (!init.ok) throw new Error(`Início do upload YouTube falhou: ${init.status} ${await init.text()}`);
  const uploadUrl = init.headers.get('location');
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Length': String(buffer.length), 'Content-Type': 'video/mp4' },
    body: buffer,
  });
  if (!put.ok) throw new Error(`Upload YouTube falhou: ${put.status} ${await put.text()}`);
  const data = await put.json();
  return { id: data.id, url: `https://youtu.be/${data.id}` };
}

async function setThumbnail(videoId, thumbnailPath) {
  const { OAuth2Client } = await import('google-auth-library');
  const oauth = new OAuth2Client(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost');
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) return;
  const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg', 'Content-Length': String(readFileSync(thumbnailPath).length) },
    body: readFileSync(thumbnailPath),
  });
  if (!response.ok) throw new Error(`Thumbnail falhou: ${response.status} ${await response.text()}`);
}

async function postComment(videoId, text) {
  const { OAuth2Client } = await import('google-auth-library');
  const oauth = new OAuth2Client(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost');
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) return;
  const response = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ snippet: { videoId, topLevelComment: { snippet: { textOriginal: text } } } }),
  });
  if (!response.ok) console.warn(`Comentário pulado: ${response.status}`);
}

async function processLongFormJob(job, options) {
  const slug = job.slug;
  const tmp = path.join(os.tmpdir(), `vetor-longform-${slugSafe(slug)}`);
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const script = job.script || {};
  const review = await getReview(slug);
  const duration = Math.max(30, Number(options.duration) || DEFAULT_DURATION);
  const output = path.resolve(options.output || path.join(ROOT, 'remotion', 'out', `${slugSafe(slug)}-longform.mp4`));
  const txt = path.join(tmp, 'narration.txt');
  const mp3 = path.join(tmp, 'narration.mp3');
  const srt = path.join(tmp, 'narration.srt');
  const thumbnail = path.join(tmp, 'thumbnail.jpg');
  const image = path.join(tmp, 'product.jpg');
  const productImageUrl = review.image_url || review.meta_og_image || '';

  try {
    console.log(`[Long-form] Roteiro: ${slug}`);
    writeFileSync(txt, buildLongNarration(script, review), 'utf8');
    console.log('[Long-form] Gerando áudio com Edge-TTS...');
    run('python', ['-m', 'edge_tts', '--voice', 'pt-BR-AntonioNeural', '--file', txt, '--write-media', mp3, '--write-subtitles', srt]);

    let downloadedImage = '';
    if (productImageUrl) {
      console.log('[Long-form] Baixando imagem do produto...');
      if (await downloadImage(productImageUrl, image)) downloadedImage = image;
      else console.warn('[Long-form] Imagem indisponível; usando fundo cinematográfico.');
    } else {
      console.warn('[Long-form] Sem imagem de review; usando fundo cinematográfico.');
    }

    console.log(`[Long-form] Renderizando ${duration}s em 1920x1080 com FFmpeg...`);
    await renderVideo({ job, review, tmp, audioPath: mp3, output, duration, image: downloadedImage });
    if (!existsSync(output)) throw new Error('O vídeo não foi gerado');
    console.log(`[Long-form] Vídeo pronto: ${output} (${(readFileSync(output).length / 1024 / 1024).toFixed(1)} MB)`);

    if (!options.noThumbnail) {
      run('ffmpeg', ['-y', '-ss', '00:00:02', '-i', output, '-frames:v', '1', '-q:v', '3', thumbnail]);
    }

    if (options.skipUpload) {
      if (!options.noStatus) {
        await sb.from('video_jobs').update({ status: 'ready_mp4', error: null, updated_at: new Date().toISOString() }).eq('slug', slug);
      }
      console.log('[Long-form] Renderização concluída sem upload.');
      return;
    }

    console.log('[Long-form] Subindo ao YouTube...');
    const affiliateUrl = review.affiliate_url || `${options.base}/review/${slug}`;
    const description = `${script.description || ''}\n\nVer oferta: ${affiliateUrl}\nReview completo: ${options.base}/review/${slug}`;
    const uploaded = await uploadToYoutube(output, {
      title: script.title,
      description,
      tags: script.tags,
      privacy: options.privacy,
    });
    if (!options.noThumbnail) await setThumbnail(uploaded.id, thumbnail);
    await postComment(uploaded.id, `Review completo do ${job.product || script.title || slug}: ${options.base}/review/${slug}`);
    await sb.from('video_jobs').update({ status: 'published', youtube_video_id: uploaded.id, youtube_url: uploaded.url, error: null, updated_at: new Date().toISOString() }).eq('slug', slug);
    console.log(`[Long-form] Publicado: ${uploaded.url}`);
  } catch (error) {
    console.error(`[Long-form] Falhou ${slug}: ${error.message}`);
    await sb.from('video_jobs').update({ status: 'failed', error: String(error.message).slice(0, 500), updated_at: new Date().toISOString() }).eq('slug', slug);
    throw error;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let job;
  if (options.slug) {
    job = await getJob(options.slug);
    if (options['skip-claim'] !== true) {
      const { data } = await sb.from('video_jobs').update({ status: 'rendering', updated_at: new Date().toISOString() }).eq('slug', options.slug).eq('status', 'script_ready').select('slug');
      if (!data?.length) throw new Error('Job já não está pendente');
    }
  } else {
    const { data: jobs } = await sb.from('video_jobs').select('*').eq('render_engine', 'remotion').eq('status', 'script_ready').order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!jobs) {
      console.log('[Long-form] Nenhum job pendente.');
      return;
    }
    job = jobs;
    const { data } = await sb.from('video_jobs').update({ status: 'rendering', updated_at: new Date().toISOString() }).eq('slug', job.slug).eq('status', 'script_ready').select('slug');
    if (!data?.length) throw new Error('Job já foi assumido por outro worker');
  }

  await processLongFormJob(job, {
    base: options.base || BASE,
    privacy: options.privacy || DEFAULT_PRIVACY,
    duration: options.duration,
    output: options.output,
    skipUpload: options['render-only'] === true || options['no-upload'] === true,
    noThumbnail: options['no-thumbnail'] === true,
    noStatus: options['no-status'] === true,
    skipClaim: options['skip-claim'] === true,
  });
}

const directRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (directRun) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { processLongFormJob };
