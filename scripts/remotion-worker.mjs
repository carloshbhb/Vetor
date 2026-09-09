// Worker Remotion: renderiza 1 vídeo premium/dia com animações React
// Busca 1 job com render_engine='remotion' → edge-tts → conversor → Remotion render → YouTube
// Uso: node scripts/remotion-worker.mjs
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ── YouTube upload (reutiliza lógica do video-worker-ci.mjs) ────────────────
async function uploadToYoutube(videoPath, { title, description, tags }) {
  const { OAuth2Client } = await import('google-auth-library');
  const oauth = new OAuth2Client(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    'http://localhost'
  );
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error('Sem access_token YouTube');

  const buf = readFileSync(videoPath);
  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(buf.length),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: (tags || []).slice(0, 15),
          categoryId: '22',
        },
        status: {
          privacyStatus: PRIVACY,
          madeForKids: false,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );
  if (!init.ok) throw new Error(`YouTube init: ${init.status} ${await init.text()}`);
  const url = init.headers.get('location');
  const put = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Length': String(buf.length),
      'Content-Type': 'video/mp4',
    },
    body: buf,
  });
  if (!put.ok) throw new Error(`YouTube upload: ${put.status} ${await put.text()}`);
  const data = await put.json();
  return { id: data.id, url: `https://youtu.be/${data.id}` };
}

async function setThumbnail(videoId, thumbPath) {
  const { OAuth2Client } = await import('google-auth-library');
  const oauth = new OAuth2Client(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    'http://localhost'
  );
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  const buf = readFileSync(thumbPath);
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
        'Content-Length': String(buf.length),
      },
      body: buf,
    }
  );
  if (!res.ok) throw new Error(`thumbnail: ${res.status} ${await res.text()}`);
}

async function postReviewComment(videoId, text) {
  const { OAuth2Client } = await import('google-auth-library');
  const oauth = new OAuth2Client(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    'http://localhost'
  );
  oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error('Sem access_token YouTube');

  const initRes = await fetch(
    'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: {
            snippet: { textOriginal: text },
          },
        },
      }),
    }
  );
  if (!initRes.ok) {
    const errTxt = await initRes.text();
    throw new Error(`comment create: ${initRes.status} ${errTxt.slice(0, 300)}`);
  }
  const commentData = await initRes.json();
  return commentData?.id || null;
}

async function downloadImage(url, dest) {
  try {
    const img = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'image/*,*/*',
      },
    });
    if (!img.ok) return false;
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length < 2048) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

// ── Converter ───────────────────────────────────────────────────────────────
const { convertVideoScriptToRemotionData } = await import('./video-to-remotion-data.mjs');

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
  run(
    `edge-tts --voice pt-BR-AntonioNeural --file "${txt}" --write-media "${mp3}" --write-subtitles "${srt}"`
  );

  // ── 2. Separar áudio em seções (hook, problem_solution, cta) ──────────────
  console.log('[2/5] Separando áudio em seções...');
  const audioDir = path.join(REMOTION_DIR, 'public', 'audio');
  if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

  const totalDuration = script.estimatedSeconds || 50;
  const hookDuration = 3;
  const ctaDuration = Math.min(20, Math.floor(totalDuration * 0.4));
  const psDuration = totalDuration - hookDuration - ctaDuration;

  // Usa ffmpeg para cortar o áudio em 3 partes
  try {
    run(
      `ffmpeg -y -i "${mp3}" -ss 0 -t ${hookDuration} -c copy "${path.join(audioDir, 'hook.mp3')}"`
    );
    run(
      `ffmpeg -y -i "${mp3}" -ss ${hookDuration} -t ${psDuration} -c copy "${path.join(audioDir, 'problem_solution.mp3')}"`
    );
    run(
      `ffmpeg -y -i "${mp3}" -ss ${hookDuration + psDuration} -t ${ctaDuration} -c copy "${path.join(audioDir, 'cta.mp3')}"`
    );
  } catch (e) {
    console.warn('[Remotion Worker] Fallback: copiando áudio completo para todas seções');
    copyFileSync(mp3, path.join(audioDir, 'hook.mp3'));
    copyFileSync(mp3, path.join(audioDir, 'problem_solution.mp3'));
    copyFileSync(mp3, path.join(audioDir, 'cta.mp3'));
  }

  // ── 3. Converter VideoScript → video-data.json ───────────────────────────
  console.log('[3/5] Convertendo roteiro...');
  // Busca dados do review
  let reviewData = {};
  try {
    const { data: rev } = await sb
      .from('reviews')
      .select('image_url, affiliate_url, hero, verdict, testimonials')
      .eq('slug', slug)
      .single();
    reviewData = rev || {};
  } catch {}

  const remotionData = convertVideoScriptToRemotionData(
    script,
    {
      ...reviewData,
      slug,
      product: job.product || slug,
      affiliateUrl: reviewData.affiliate_url || '',
      imageUrl: reviewData.image_url || '',
      hero: reviewData.hero || {},
      verdict: reviewData.verdict || {},
      testimonials: reviewData.testimonials || [],
    },
    BASE
  );

  // Salvar video-data.json no diretório Remotion
  writeFileSync(
    path.join(REMOTION_DIR, 'video-data.json'),
    JSON.stringify(remotionData, null, 2),
    'utf8'
  );

  // ── 4. Renderizar com Remotion ───────────────────────────────────────────
  console.log('[4/5] Renderizando com Remotion...');
  const outDir = path.join(REMOTION_DIR, 'out');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${slug}.mp4`);

  // Atualiza Root.tsx dinamicamente com os dados do vídeo
  const rootContent = `import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import videoData from "../video-data.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RemotionComposition = Composition as any;

export const Root: React.FC = () => {
  const { meta } = videoData;

  return (
    <RemotionComposition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={meta.duration * meta.fps}
      fps={meta.fps}
      width={meta.resolution.width}
      height={meta.resolution.height}
      defaultProps={{
        data: videoData,
      }}
    />
  );
};
`;
  writeFileSync(path.join(REMOTION_DIR, 'src', 'Root.tsx'), rootContent, 'utf8');

  // Instalar deps do Remotion se necessário
  if (!existsSync(path.join(REMOTION_DIR, 'node_modules'))) {
    console.log('[Remotion Worker] Instalando dependências do Remotion...');
    run('npm install --no-audit --no-fund', { cwd: REMOTION_DIR });
  }

  // Garantir que o browser está disponível
  try {
    run('npx remotion browser ensure', { cwd: REMOTION_DIR });
  } catch (e) {
    console.warn('[Remotion Worker] Aviso browser ensure:', e.message);
  }

  run(
    `npx remotion render ShortVideo "${outputPath}" --props='${JSON.stringify({ data: remotionData })}'`,
    { cwd: REMOTION_DIR }
  );

  if (!existsSync(outputPath)) {
    throw new Error('Remotion render falhou: arquivo não gerado');
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
  });

  // Thumbnail
  try {
    run(
      `ffmpeg -y -ss ${Math.floor(totalDuration / 2)} -i "${outputPath}" -frames:v 1 -q:v 3 "${thumb}"`
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
