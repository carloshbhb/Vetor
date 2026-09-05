// Worker CI 100% ONLINE (GitHub Actions, grátis, sem PC).
// Faz tudo no runner: busca jobs script_ready → edge-tts → ffmpeg → upload YouTube → marca published.
// Uso local (opcional): SITE_BASE=https://www.vetor.blog node scripts/video-worker-ci.mjs
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = (process.env.SITE_BASE || 'https://www.vetor.blog').replace(/\/$/, '');
const LIMIT = Math.min(Number(process.env.VIDEO_LIMIT || 6), 6);
const PRIVACY = process.env.YOUTUBE_PRIVACY || 'unlisted';

const run = (cmd) => { console.log('> ' + cmd); execSync(cmd, { stdio: 'inherit' }); };

// Supabase admin (para ler jobs + marcar published direto, sem passar MP4 pela Vercel)
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// YouTube upload direto do runner (mesma lógica de lib/youtube.ts, sem importar @/)
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

// 1. Garante roteiros do dia (chama o cron da Vercel — leve, só IA)
console.log(`[1/3] Gerando fila via ${BASE}/api/cron/video-queue ...`);
try {
  const q = await fetch(`${BASE}/api/cron/video-queue?token=${process.env.CRON_SECRET}&limit=${LIMIT}`);
  console.log('queue:', (await q.text()).slice(0, 300));
} catch (e) { console.warn('queue falhou (segue com pendentes):', e.message); }

// 2. Busca pendentes (com token do worker — middleware libera via ?token=CRON_SECRET)
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
  const jpg = path.join(tmp, `${slug}.jpg`);
  const mp4 = path.join(tmp, `${slug}.mp4`);
  try {
    await sb.from('video_jobs').update({ status: 'rendering', attempts: (job.attempts || 0) + 1 }).eq('slug', slug);
    writeFileSync(txt, script.fullNarration || '', 'utf8');
    run(`edge-tts --voice pt-BR-AntonioNeural --file "${txt}" --write-media "${mp3}"`);
    // imagem do review (direto do Supabase — sem endpoint extra)
    try {
      const { data: rev } = await sb.from('reviews').select('image_url').eq('slug', slug).single();
      const imgUrl = rev?.image_url;
      if (imgUrl && !existsSync(jpg)) {
        const img = await fetch(imgUrl);
        if (img.ok) writeFileSync(jpg, Buffer.from(await img.arrayBuffer()));
      }
    } catch {}
    const hook = String(script.scenes?.[0]?.onScreenText || script.hook || '').replace(/'/g, '').slice(0, 60);
    const inputImg = existsSync(jpg) ? `-loop 1 -i "${jpg}"` : `-f lavfi -loop 1 -i "color=c=0x0b1220:s=1080x1920"`;
    const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
    const fontOpt = existsSync(FONT) ? `:fontfile=${FONT}` : '';
    const dt = hook ? `,drawtext=text='${hook}'${fontOpt}:fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h*0.72:box=1:boxcolor=black@0.6:boxborderw=24` : '';
    run(`ffmpeg -y ${inputImg} -i "${mp3}" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${dt}[v]" -map "[v]" -map 1:a -t ${script.estimatedSeconds || 50} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${mp4}"`);
    // 3. Upload direto → YouTube
    console.log('[3/3] Subindo ao YouTube...');
    const siteUrl = BASE;
    const up = await uploadToYoutube(mp4, {
      title: script.title,
      description: `${script.description || ''}\n\nReview completo: ${siteUrl}/review/${slug}`,
      tags: script.tags,
    });
    await sb.from('video_jobs').update({ status: 'published', youtube_video_id: up.id, youtube_url: up.url, error: null }).eq('slug', slug);
    console.log('Publicado → ' + up.url);
    ok++;
  } catch (e) {
    console.error('Falhou ' + slug + ': ' + e.message);
    await sb.from('video_jobs').update({ status: 'failed', error: String(e.message).slice(0, 500) }).eq('slug', slug);
  }
}
console.log(`\nFim: ${ok}/${jobs.length} publicados.`);
process.exit(ok ? 0 : 1);
