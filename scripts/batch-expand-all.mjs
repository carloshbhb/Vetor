import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { generateFullReview } from './expand-reviews-gemini.mjs';
import { upsertReviewDirect } from './upsert-single.mjs';

config({ path: '.env.local' });

const PROGRESS_FILE = path.resolve('tmp/expand-progress.json');

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Erro ao carregar progresso, iniciando novo:', e.message);
  }
  return {};
}

function saveProgress(progress) {
  try {
    fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (e) {
    console.error('Erro ao salvar progresso:', e.message);
  }
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const opts = {
    limit: 0,
    offset: 0,
    concurrency: 2,
    only: null,
    force: false,
    minChars: 9500
  };

  for (const arg of args) {
    if (arg.startsWith('--limit=')) opts.limit = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--offset=')) opts.offset = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--concurrency=')) opts.concurrency = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--min-chars=')) opts.minChars = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--only=')) opts.only = arg.split('=')[1].split(',').map(s => s.trim());
    if (arg === '--force') opts.force = true;
  }
  return opts;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processReview(item, minChars, force, progress) {
  const slug = item.slug;
  if (!force && progress[slug] && progress[slug].status === 'success' && progress[slug].chars >= minChars) {
    console.log(`⏩ [Pular] ${slug} já possui ${progress[slug].chars} caracteres gravados.`);
    return { slug, status: 'skipped', chars: progress[slug].chars };
  }

  const startTime = Date.now();
  try {
    const fullReview = await generateFullReview(item);
    
    // Check if character count satisfies SEO requirements
    if (fullReview.totalChars < minChars) {
      console.warn(`⚠️ [Atenção] ${slug} gerou apenas ${fullReview.totalChars} caracteres (abaixo de ${minChars}).`);
    }

    // Save individual json backup
    fs.mkdirSync('tmp/expanded', { recursive: true });
    fs.writeFileSync(`tmp/expanded/${slug}.json`, JSON.stringify(fullReview, null, 2));

    // Upsert to Supabase
    const ok = await upsertReviewDirect(fullReview);
    if (!ok) {
      throw new Error('Falha no upsert para Supabase');
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    progress[slug] = {
      status: 'success',
      chars: fullReview.totalChars,
      sections: fullReview.sections?.length || 0,
      timestamp: new Date().toISOString(),
      elapsedSec: Number(elapsedSec)
    };
    saveProgress(progress);

    console.log(`✅ [OK] ${slug}: ${fullReview.totalChars} chars em ${fullReview.sections?.length} seções (${elapsedSec}s)`);
    return { slug, status: 'success', chars: fullReview.totalChars };
  } catch (err) {
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`❌ [Erro] ${slug} falhou após ${elapsedSec}s:`, err.message);
    progress[slug] = {
      status: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    };
    saveProgress(progress);
    return { slug, status: 'error', error: err.message };
  }
}

async function main() {
  const opts = parseCliArgs();
  console.log('--- Iniciando Expansão de Reviews com SEO & GEO ---');
  console.log('Opções:', opts);

  const inventoryPath = path.resolve('scripts/active-reviews-to-rewrite.json');
  if (!fs.existsSync(inventoryPath)) {
    console.error('Arquivo scripts/active-reviews-to-rewrite.json não encontrado.');
    process.exit(1);
  }

  const allReviews = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  let targetReviews = allReviews;

  if (opts.only && opts.only.length > 0) {
    targetReviews = allReviews.filter(r => opts.only.includes(r.slug));
  } else {
    if (opts.offset > 0) targetReviews = targetReviews.slice(opts.offset);
    if (opts.limit > 0) targetReviews = targetReviews.slice(0, opts.limit);
  }

  console.log(`Total selecionado para processamento: ${targetReviews.length} reviews.`);
  const progress = loadProgress();

  // Process in chunks by concurrency
  const results = [];
  const concurrency = Math.max(1, opts.concurrency);

  for (let i = 0; i < targetReviews.length; i += concurrency) {
    const chunk = targetReviews.slice(i, i + concurrency);
    console.log(`\n▶ Processando lote ${Math.floor(i / concurrency) + 1} / ${Math.ceil(targetReviews.length / concurrency)} (${chunk.map(c => c.slug).join(', ')})`);
    
    const chunkPromises = chunk.map(item => processReview(item, opts.minChars, opts.force, progress));
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Polite delay between batches to respect API limits
    if (i + concurrency < targetReviews.length) {
      await sleep(1500);
    }
  }

  console.log('\n================ RESUMO DO PROCESSAMENTO ================');
  const successCount = results.filter(r => r.status === 'success').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  console.log(`Sucessos: ${successCount}`);
  console.log(`Pulados:  ${skippedCount}`);
  console.log(`Erros:    ${errorCount}`);
  console.log('Progresso consolidado em tmp/expand-progress.json');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
