// Worker LOCAL gratuito — renderiza + publica até 30 vídeos/dia.
// O cron da Vercel só gera roteiros (leve). Este worker faz o pesado:
// edge-tts + ffmpeg + upload. Rode 1x/dia no seu PC.
//
// Uso: node scripts/video-worker.mjs [--base http://localhost:3000] [--privacy unlisted]
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Carrega .env.local automaticamente (não é carregado pelo Node nativamente)
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

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const base = (args.base || process.env.SITE_BASE || 'http://localhost:3000').replace(/\/$/, '');
const privacy = args.privacy || 'unlisted';

const run = (cmd) => { console.log('> ' + cmd); execSync(cmd, { stdio: 'inherit' }); };

// 1. Pega fila pendente (token libera o middleware; em dev use CRON_SECRET do .env.local)
const _token = process.env.CRON_SECRET ? `?token=${process.env.CRON_SECRET}` : '';
const status = await (await fetch(`${base}/api/video-jobs${_token}`)).json();
console.log(`Hoje: ${status.today} | Backlog: ${status.backlogRemaining} | Com vídeo: ${status.withVideo}/${status.totalReviews}`);
const pending = (status.jobs || []).filter((j) => ['script_ready', 'ready_mp4'].includes(j.status)).slice(0, 30);

if (!pending.length) {
  console.log('Nada para renderizar. Se o backlog > 0, rode primeiro o cron: /api/cron/video-queue?token=SEU_CRON_SECRET');
  process.exit(0);
}

let ok = 0;
for (const job of pending) {
  console.log(`\n═══ ${job.slug} (${ok + 1}/${pending.length}) ═══`);
  try {
    run(`node scripts/make-shorts.mjs --slug "${job.slug}" --base "${base}"`);
    const res = await fetch(`${base}/api/video-publish${_token}`, {
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
