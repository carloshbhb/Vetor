import { config } from 'dotenv';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { runMercadoLivreMatchBatch } from '../src/lib/mercadolivre-match-batch';
import {
  archiveLandingPageCoveredProducts,
  boostAffiliatePriorityFromSeo,
  importSocialList,
  promoteMatchedAffiliates,
  syncSocialList,
} from '../src/lib/mercadolivre-refill';

config({ path: '.env.local' });

const args = new Set(process.argv.slice(2));

function truthy(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function flag(name: string, envName: string): boolean {
  return args.has('--' + name) || truthy(process.env[envName]);
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const dryRun = flag('dry-run', 'REFILL_DRY_RUN');
const skipSync = flag('skip-sync', 'REFILL_SKIP_SYNC');
const skipImport = flag('skip-import', 'REFILL_SKIP_IMPORT');
const skipSeo = flag('skip-seo', 'REFILL_SKIP_SEO');
const skipBatch = flag('skip-batch', 'REFILL_SKIP_BATCH');
const skipPromote = flag('skip-promote', 'REFILL_SKIP_PROMOTE');
const skipCleanup = flag('skip-cleanup', 'REFILL_SKIP_CLEANUP');
const maxBatches = Math.min(Math.max(numberEnv('REFILL_MAX_BATCHES', 15), 1), 30);
const batchSize = Math.min(Math.max(numberEnv('REFILL_BATCH_SIZE', 20), 1), 20);

type BatchSummary = {
  batches: number;
  processed: number;
  remaining: number | null;
  results: Array<Record<string, unknown>>;
};

/**
 * Checks the client pair against the token endpoint without printing it. A
 * dummy refresh token returns invalid_grant when the pair is valid, and
 * invalid_client when the pair is wrong. Only the latter blocks token refresh.
 */
async function checkMercadoLivreCredentials(): Promise<string | null> {
  const clientId = process.env.ML_CLIENT_ID?.trim();
  const clientSecret = process.env.ML_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return 'ML_CLIENT_ID/ML_CLIENT_SECRET ausentes; o refresh dependerá do token salvo no Supabase.';
  }

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'refill-preflight-token',
      }).toString(),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (payload.error === 'invalid_client') {
      return 'ML_CLIENT_ID/ML_CLIENT_SECRET inválidos (invalid_client); o refresh do token falhará. Atualize os secrets do GitHub com as credenciais do app Mercado Livre.';
    }
    return null;
  } catch (error) {
    return 'preflight ML indisponível: ' + (error instanceof Error ? error.message : String(error));
  }
}

function isMercadoLivreAuthError(value: unknown): boolean {
  return /invalid_client|invalid_grant|failed to refresh|refresh token|oauth/i.test(String(value || ''));
}

async function main(): Promise<void> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    throw new Error('Supabase Service Role ausente. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY.');
  }

  const summary: Record<string, unknown> = {
    ok: false,
    event: 'content-queue-refill',
    dryRun,
    maxBatches,
    batchSize,
    startedAt: new Date().toISOString(),
    socialList: null,
    import: null,
    seoBoost: null,
    batch: null,
    promotion: null,
    cleanup: null,
    criticalErrors: [] as string[],
    warnings: [] as string[],
  };

  const criticalErrors = summary.criticalErrors as string[];
  const warnings = summary.warnings as string[];

  const credentialWarning = await checkMercadoLivreCredentials();
  if (credentialWarning) {
    warnings.push('ml-auth: ' + credentialWarning);
    console.warn('[refill] ' + credentialWarning);
  } else {
    console.log('[refill] credenciais ML válidas (preflight).');
  }

  if (!skipSync) {
    try {
      console.log('[refill] sincronizando Lista Social...');
      summary.socialList = await syncSocialList(supabase, { dryRun });
      console.log('[refill] Lista Social:', JSON.stringify(summary.socialList));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push('social-list: ' + message);
      console.warn('[refill] sync da Lista Social falhou:', message);
    }
  }

  if (!skipImport) {
    try {
      console.log('[refill] importando Lista Social para affiliate_links...');
      summary.import = await importSocialList(supabase, { dryRun });
      console.log('[refill] import:', JSON.stringify(summary.import));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      criticalErrors.push('import: ' + message);
      console.error('[refill] import falhou:', message);
    }
  }

  if (!skipSeo) {
    try {
      console.log('[refill] aplicando prioridade de seo_keywords...');
      summary.seoBoost = await boostAffiliatePriorityFromSeo(supabase, { dryRun, maxBoost: 50 });
      console.log('[refill] seo boost:', JSON.stringify(summary.seoBoost));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push('seo-boost: ' + message);
      console.warn('[refill] boost SEO falhou:', message);
    }
  }

  if (!skipBatch) {
    if (dryRun) {
      console.log('[refill] dry-run: lote de matching ignorado (grava affiliate_link_ml_matches).');
    } else {
      const batch: BatchSummary = { batches: 0, processed: 0, remaining: null, results: [] };
      for (let index = 0; index < maxBatches; index += 1) {
        try {
          const result = await runMercadoLivreMatchBatch(supabase, { limit: batchSize });
          batch.batches += 1;
          batch.processed += result.processed;
          batch.remaining = result.remaining;
          batch.results.push(...(result.results || []));
          console.log(
            '[refill] lote ' + batch.batches + ': processados=' + result.processed +
            ' restantes=' + result.remaining +
            (result.message ? ' (' + result.message + ')' : '')
          );

          const authFailures = (result.results || []).filter((item) => isMercadoLivreAuthError(item.error)).length;
          if (authFailures > 0 && authFailures === result.processed) {
            criticalErrors.push('matching: todas as buscas do lote falharam na autenticação do Mercado Livre. Verifique ML_CLIENT_ID/ML_CLIENT_SECRET e reautorize o app se o refresh token estiver revogado.');
            break;
          }

          if (result.processed === 0 || result.remaining === 0) break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          criticalErrors.push('matching: ' + message);
          console.error('[refill] lote falhou:', message);
          break;
        }
      }
      summary.batch = batch;
    }
  }

  if (!skipPromote) {
    try {
      console.log('[refill] promovendo matches para comparison_product...');
      summary.promotion = await promoteMatchedAffiliates(supabase, { dryRun, limit: 500 });
      console.log('[refill] promoção:', JSON.stringify(summary.promotion));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      criticalErrors.push('promotion: ' + message);
      console.error('[refill] promoção falhou:', message);
    }
  }

  if (!skipCleanup) {
    try {
      console.log('[refill] arquivando product_links cobertos por landing page...');
      summary.cleanup = await archiveLandingPageCoveredProducts(supabase, { dryRun });
      console.log('[refill] limpeza LP:', JSON.stringify(summary.cleanup));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push('lp-cleanup: ' + message);
      console.warn('[refill] limpeza LP falhou:', message);
    }
  }

  summary.ok = criticalErrors.length === 0;
  summary.finishedAt = new Date().toISOString();
  console.log('[refill] resumo=' + JSON.stringify(summary, null, 2));

  if (criticalErrors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[refill] erro fatal:', error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
