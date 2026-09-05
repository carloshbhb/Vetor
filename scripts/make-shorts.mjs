// ─────────────────────────────────────────────────────────────────────────────
// Pipeline 100% GRATUITO: Review → Shorts MP4 9:16 → YouTube
// Ferramentas free: Gemini/OpenRouter (roteiro) + edge-tts (narração) + ffmpeg (montagem)
// + YouTube Data API v3 (cota grátis ≈ 6 uploads/dia)
// ─────────────────────────────────────────────────────────────────────────────
// Pré-requisitos (uma vez só, tudo grátis):
//   winget install Gyan.FFmpeg        # ffmpeg
//   pip install edge-tts               # narração neural pt-BR, sem API key
//
// Uso:
//   node scripts/make-shorts.mjs --slug meu-review --base http://localhost:3000
//   # gera tmp/<slug>.mp3 + tmp/<slug>.mp4 + tmp/<slug>.script.json
//   # depois: POST /api/video-publish { slug }  → sobe p/ YouTube (unlisted)
// ─────────────────────────────────────────────────────────────────────────────
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const slug = args.slug;
const base = (args.base || process.env.SITE_BASE || 'http://localhost:3000').replace(/\/$/, '');
if (!slug) {
  console.error('Uso: node scripts/make-shorts.mjs --slug <slug-do-review> [--base http://localhost:3000]');
  process.exit(1);
}

const tmp = path.join(process.cwd(), 'tmp');
if (!existsSync(tmp)) mkdirSync(tmp, { recursive: true });
const scriptPath = path.join(tmp, `${slug}.script.json`);
const audioPath = path.join(tmp, `${slug}.mp3`);
const imgPath = path.join(tmp, `${slug}.jpg`);
const outPath = path.join(os.tmpdir(), `${slug}.mp4`);

const run = (cmd) => { console.log('> ' + cmd); execSync(cmd, { stdio: 'inherit' }); };

// 1. Roteiro (usa sua API já pronta, que usa Gemini grátis / OpenRouter free)
console.log('\n[1/4] Gerando roteiro...');
const r = await fetch(`${base}/api/video-script`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ slug }),
});
if (!r.ok) throw new Error(`video-script falhou: ${r.status} ${await r.text()}`);
const payload = await r.json();
writeFileSync(scriptPath, JSON.stringify(payload, null, 2));
const script = payload.script;
console.log(`Título: ${script.title}\nDuração estimada: ${script.estimatedSeconds}s`);

// 2. Baixa imagem do review (grátis, já é sua)
try {
  const imgUrl = payload.review?.imageUrl || payload.imageUrl;
  if (imgUrl && !existsSync(imgPath)) {
    console.log('\n[2/4] Baixando imagem do produto...');
    const imgRes = await fetch(imgUrl);
    if (imgRes.ok) writeFileSync(imgPath, Buffer.from(await imgRes.arrayBuffer()));
  }
} catch { /* segue sem imagem customizada */ }
if (!existsSync(imgPath)) {
  console.log('\n[2/4] Sem imagem do review — usando fundo gerado via ffmpeg.');
}

// 3. Narração GRÁTIS via edge-tts (voz neural pt-BR, sem API key)
console.log('\n[3/4] Gerando narração (edge-tts, grátis)...');
writeFileSync(path.join(tmp, `${slug}.txt`), script.fullNarration, 'utf8');
try {
  run(`edge-tts --voice pt-BR-AntonioNeural --file "${path.join(tmp, `${slug}.txt`)}" --write-media "${audioPath}"`);
} catch {
  console.error('\nInstale o edge-tts: pip install edge-tts');
  process.exit(1);
}

// 4. Montagem GRÁTIS via ffmpeg: 1080x1920 + legenda do hook + áudio
console.log('\n[4/4] Montando MP4 9:16...');
const hook = (script.scenes?.[0]?.onScreenText || script.hook || '').replace(/'/g, '').slice(0, 60);
const inputImg = existsSync(imgPath) ? `-loop 1 -i "${imgPath}"` : `-f lavfi -loop 1 -i "color=c=0x0b1220:s=1080x1920"`;
const drawtext = hook
  ? `,drawtext=text='${hook}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h*0.72:box=1:boxcolor=black@0.6:boxborderw=24`
  : '';
run(
  `ffmpeg -y ${inputImg} -i "${audioPath}" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${drawtext}[v]" -map "[v]" -map 1:a -t ${script.estimatedSeconds || 50} -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${outPath}"`
);

console.log(`\nOK → ${outPath}`);
console.log(`Próximo passo (publicar grátis): curl -X POST ${base}/api/video-publish -H "Content-Type: application/json" -d "{\\"slug\\":\\"${slug}\\"}"`);
