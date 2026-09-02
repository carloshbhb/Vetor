import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load Environment ───────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const { JWT } = await import('google-auth-library');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let rawKey = process.env.GOOGLE_PRIVATE_KEY;

if (!rawKey || !email) {
  console.error('ERRO: GOOGLE_SERVICE_ACCOUNT_EMAIL ou GOOGLE_PRIVATE_KEY nao configurados.');
  console.error('Configure as variaveis de ambiente em .env.local ou no Vercel.');
  process.exit(1);
}

// ─── Normalize Key ──────────────────────────────────────────────────────────
let privateKey = rawKey
  .replace(/\\n/g, '\n')
  .replace(/\\r\\n/g, '\n')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/^"/, '').replace(/"$/, '')
  .trim();

if (!privateKey.includes('-----BEGIN')) {
  privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
}

// ─── Auth ───────────────────────────────────────────────────────────────────
const jwtClient = new JWT({
  email,
  key: privateKey,
  scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/indexing',
  ],
});

let token;
try {
  token = await jwtClient.authorize();
  console.log('Autenticacao com Google OK');
  console.log(`Token: ${token.access_token?.slice(0, 20)}...`);
} catch (e) {
  console.error('FALHA na autenticacao:', e.message);
  process.exit(1);
}

// ─── Get all URLs from sitemap ──────────────────────────────────────────────
async function getSitemapUrls() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  console.log(`\nBuscando sitemap: ${sitemapUrl}`);

  try {
    const response = await fetch(sitemapUrl);
    const xml = await response.text();

    const urls = [];
    const regex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      urls.push(match[1]);
    }

    console.log(`Encontradas ${urls.length} URLs no sitemap`);
    return urls;
  } catch (e) {
    console.error('Erro ao buscar sitemap:', e.message);
    return [];
  }
}

// ─── URL Inspection ─────────────────────────────────────────────────────────
async function inspectUrl(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.access_token}`,
        },
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl: SITE_URL.endsWith('/') ? SITE_URL : `${SITE_URL}/`,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json();

      // Debug: log raw response for ALL URLs
      if (process.env.DEBUG) {
        console.log(`\n[DEBUG] Raw response for ${url}:`);
        console.log(JSON.stringify(data, null, 2));
      }

      if (!response.ok) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return {
          url,
          error: data.error?.message || `HTTP ${response.status}`,
          verdict: 'ERROR',
          coverageState: 'ERROR',
        };
      }

      const result = data.inspectionResult;
      const indexStatus = result?.indexStatusResult || {};

      return {
        url,
        verdict: indexStatus.verdict || 'UNKNOWN',
        coverageState: indexStatus.coverageState || 'UNKNOWN',
        robotsTxtState: indexStatus.robotsTxtState || 'UNKNOWN',
        pageFetchState: indexStatus.pageFetchState || 'UNKNOWN',
        indexingState: indexStatus.indexingState || 'UNKNOWN',
        lastCrawlTime: indexStatus.lastCrawlTime || null,
        googleCanonical: indexStatus.googleCanonical || null,
        userCanonical: indexStatus.userCanonical || null,
        sitemap: indexStatus.sitemap || [],
        crawledAs: indexStatus.crawledAs || 'UNKNOWN',
        referringUrls: indexStatus.referringUrls || [],
      };
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return {
        url,
        error: e.message,
        verdict: 'ERROR',
        coverageState: 'ERROR',
      };
    }
  }
}

// ─── Analyze and suggest solutions ──────────────────────────────────────────
function analyzeResult(result) {
  const issues = [];
  const solutions = [];
  const cs = result.coverageState || '';

  // ── Coverage State Analysis (the primary indicator) ──
  if (cs === 'Submitted and indexed') {
    return { status: 'INDEXADA', icon: 'OK', issues: [], solutions: [] };
  }

  if (cs === 'Discovered - currently not indexed') {
    issues.push('Descoberta mas NAO indexada ainda');
    solutions.push('Envie para indexacao via Google Indexing API');
    solutions.push('Adicione links internos para esta pagina');
    solutions.push('Verifique se o conteudo e unico e relevante');
  } else if (cs === 'Crawled - currently not indexed') {
    issues.push('Crawled mas o Google decidiu NAO indexar');
    solutions.push('Melhore a qualidade do conteudo');
    solutions.push('Adicione mais conteudo original e detalhado');
    solutions.push('Verifique se nao ha conteudo duplicado');
  } else if (cs === 'URL is unknown to Google') {
    issues.push('URL desconhecida pelo Google');
    solutions.push('Envie para indexacao via Google Indexing API');
    solutions.push('Adicione esta URL no sitemap.xml');
    solutions.push('Crie links internos apontando para esta pagina');
  } else if (cs === 'Page with redirect') {
    issues.push('Pagina com redirecionamento');
    solutions.push('Verifique se o redirecionamento 301 esta correto');
  } else if (cs.includes('Soft 404')) {
    issues.push('Google classifica como soft 404');
    solutions.push('Verifique se a pagina retorna conteudo real');
    solutions.push('Melhore o conteudo para nao parecer uma pagina de erro');
  } else if (cs.includes('Not found') || cs.includes('404')) {
    issues.push('Pagina nao encontrada (404)');
    solutions.push('Verifique se a URL esta correta');
    solutions.push('Crie a pagina ou redirecione para URL existente');
  } else if (cs === 'Excluded by noindex tag') {
    issues.push('Bloqueada pela tag noindex');
    solutions.push('Remova a tag <meta name="robots" content="noindex"> da pagina');
  } else if (cs !== 'UNKNOWN' && cs !== '') {
    issues.push(`Estado: ${cs}`);
  }

  // ── Robots.txt check ──
  if (result.robotsTxtState === 'BLOCKED_BY_ROBOTS_TXT') {
    issues.push('Bloqueada pelo robots.txt');
    solutions.push('Remova a regra Disallow para esta URL no robots.txt');
  }

  // ── Verdict check ──
  if (result.verdict === 'FAIL') {
    issues.push('Verdict FAIL - insira no Search Console para detalhes');
  }

  // ── Canonical check ──
  if (result.googleCanonical && result.userCanonical) {
    if (result.googleCanonical !== result.userCanonical) {
      issues.push(`Canonical diverge: Google=${result.googleCanonical}, Voce=${result.userCanonical}`);
      solutions.push('Alinhe o canonical URL para apontar para a versao correta');
    }
  }

  const status = issues.length === 0 ? 'INDEXADA' : 'NAO_INDEXADA';

  return { status, icon: issues.length === 0 ? 'OK' : 'ALERTA', issues, solutions };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('VERIFICACAO DE INDEXACAO - GOOGLE SEARCH CONSOLE');
  console.log('='.repeat(70));
  console.log(`Site: ${SITE_URL}`);
  console.log(`Data: ${new Date().toISOString()}`);

  const urls = await getSitemapUrls();
  if (urls.length === 0) {
    console.error('Nenhuma URL encontrada no sitemap. Abortando.');
    process.exit(1);
  }

  console.log(`\nInspecionando ${urls.length} URLs...\n`);

  const results = [];
  const indexed = [];
  const notIndexed = [];
  const errors = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stdout.write(`[${i + 1}/${urls.length}] ${url.replace(SITE_URL, '')} ... `);

    try {
      const result = await inspectUrl(url);
      const analysis = analyzeResult(result);

      results.push({ ...result, analysis });

      if (analysis.status === 'INDEXADA') {
        indexed.push(url);
        console.log('INDEXADA');
      } else if (result.error) {
        errors.push({ url, error: result.error });
        console.log(`ERRO: ${result.error}`);
      } else {
        notIndexed.push({ url, analysis, coverageState: result.coverageState });
        console.log(`NAO INDEXADA: ${analysis.issues[0]}`);
      }
    } catch (e) {
      errors.push({ url, error: e.message });
      console.log(`ERRO: ${e.message}`);
    }

    // Rate limiting - 1 request per second
    if (i < urls.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // ─── Report ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('RELATORIO FINAL');
  console.log('='.repeat(70));
  console.log(`Total de URLs: ${urls.length}`);
  console.log(`Indexadas: ${indexed.length}`);
  console.log(`Nao indexadas: ${notIndexed.length}`);
  console.log(`Erros: ${errors.length}`);

  if (notIndexed.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('PAGINAS NAO INDEXADAS - MOTIVOS E SOLUCOES');
    console.log('-'.repeat(70));

    for (const item of notIndexed) {
      const path = item.url.replace(SITE_URL, '') || '/';
      console.log(`\n  URL: ${path}`);
      console.log(`  Coverage: ${item.coverageState || item.analysis.status}`);
      for (const issue of item.analysis.issues) {
        console.log(`  - Motivo: ${issue}`);
      }
      for (const solution of item.analysis.solutions) {
        console.log(`  + Solucao: ${solution}`);
      }
    }
  }

  if (errors.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('ERROS DE ACESSO');
    console.log('-'.repeat(70));
    for (const item of errors) {
      const path = item.url.replace(SITE_URL, '') || '/';
      console.log(`  ${path}: ${item.error}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Relatorio finalizado em:', new Date().toISOString());
  console.log('='.repeat(70));

  // Save report to file
  const reportPath = path.join(__dirname, '..', 'tmp', 'indexing-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    siteUrl: SITE_URL,
    total: urls.length,
    indexed: indexed.length,
    notIndexed: notIndexed.length,
    errors: errors.length,
    results: results.map(r => ({
      url: r.url,
      verdict: r.verdict,
      coverageState: r.coverageState,
      indexingState: r.indexingState,
      robotsTxtState: r.robotsTxtState,
      pageFetchState: r.pageFetchState,
      lastCrawlTime: r.lastCrawlTime,
      googleCanonical: r.googleCanonical,
      analysis: r.analysis,
    })),
  };

  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nRelatorio salvo em: ${reportPath}`);
  } catch (e) {
    console.error('Erro ao salvar relatorio:', e.message);
  }
}

main().catch(e => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
