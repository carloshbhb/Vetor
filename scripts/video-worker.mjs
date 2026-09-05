// Worker LOCAL gratuito — renderiza + publica até 6 vídeos/dia.
// O cron da Vercel só gera roteiros (leve). Este worker faz o pesado:
// edge-tts + ffmpeg + upload. Rode 1x/dia no seu PC.
//
// Uso: node scripts/video-worker.mjs [--base http://localhost:3000] [--privacy unlisted]
import { execSync } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const base = (args.base || process.env.SITE_BASE || 'http://localhost:3000').replace(/\/$/, '');
const privacy = args.privacy || 'unlisted';

const run = (cmd) => { console.log('> ' + cmd); execSync(cmd, { stdio: 'inherit' }); };

// 1. Pega fila pendente
const status = await (await fetch(`${base}/api/video-jobs`)).json();
console.log(`Hoje: ${status.today} | Backlog: ${status.backlogRemaining} | Com vídeo: ${status.withVideo}/${status.totalReviews}`);
const pending = (status.jobs || []).filter((j) => ['script_ready', 'ready_mp4'].includes(j.status)).slice(0, 6);

if (!pending.length) {
  console.log('Nada para renderizar. Se o backlog > 0, rode primeiro o cron: /api/cron/video-queue?token=SEU_CRON_SECRET');
  process.exit(0);
}

let ok = 0;
for (const job of pending) {
  console.log(`\n═══ ${job.slug} (${ok + 1}/${pending.length}) ═══`);
  try {
    run(`node scripts/make-shorts.mjs --slug "${job.slug}" --base "${base}"`);
    const res = await fetch(`${base}/api/video-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: job.slug, privacy }),
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'publish falhou');
    console.log('Publicado → ' + out.url);
    ok++;
  } catch (e) {
    console.error('Falhou ' + job.slug + ': ' + e.message);
  }
}
console.log(`\nFim: ${ok}/${pending.length} publicados.`);
