// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Restauração automática do Supabase legado (projeto antigo)
// Um cron diário chama restoreLegacyReviews():
//  1. Probe LEVE no projeto antigo (1 linha, só slug). Se bloqueado (402) ou
//     erro qualquer → no-op barato, tenta de novo amanhã.
//  2. Se desbloqueou: lista slugs dos dois bancos (coluna única, paginado),
//     calcula os faltantes e importa SÓ esses (lotes pequenos).
//  3. Faz upsert no banco novo + commit dos faltantes no data/reviews.json
//     do GitHub (dispara redeploy na Vercel com o JSON atualizado).
// Tudo idempotente: rodar N vezes sem faltantes custa 2 queries leves.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mapToReviewData } from './db';
import { fetchFileFromGitHub, commitFileToGitHub } from './github';

export interface RestoreResult {
  ok: boolean;
  reason: string;
  legacyTotal?: number;
  mainTotal?: number;
  missingTotal?: number;
  restored?: number;
  restoredSlugs?: string[];
  githubCommitted?: boolean;
  error?: string;
}

// Colunas conhecidas da tabela reviews (whitelist: ignora colunas extras do legado)
const REVIEW_COLUMNS = [
  'slug', 'status', 'product', 'category', 'marketplace',
  'price_old', 'price_new', 'affiliate_url', 'image_url', 'ads_enabled',
  'meta_title', 'meta_description', 'meta_keywords', 'meta_reading_time',
  'meta_canonical', 'meta_og_image',
  'hero_headline_line1', 'hero_headline_line2', 'hero_headline_em',
  'hero_lead', 'hero_overall_score', 'hero_bars',
  'specs', 'sections', 'compare_table', 'pros', 'cons', 'testimonials', 'faq',
  'verdict_score', 'verdict_label', 'verdict_text', 'verdict_note',
  'schema_rating_value', 'schema_review_count',
  'google_rank', 'last_rank_check', 'created_at', 'updated_at',
];

function pickKnownColumns(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const col of REVIEW_COLUMNS) {
    if (row[col] !== undefined) out[col] = row[col];
  }
  if (out.faq === undefined) out.faq = [];
  return out;
}

function getLegacyClient(): SupabaseClient | null {
  const url = process.env.LEGACY_SUPABASE_URL;
  const key = process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getMainClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Lista TODOS os slugs com paginação (só 1 coluna curta por linha — egress mínimo)
async function listAllSlugs(sb: SupabaseClient): Promise<string[]> {
  const slugs: string[] = [];
  const pageSize = 1000;
  for (let page = 0; ; page++) {
    const { data, error } = await sb
      .from('reviews')
      .select('slug')
      .order('slug', { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw new Error(`list slugs: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data as Array<{ slug: string }>) {
      if (r.slug) slugs.push(r.slug);
    }
    if (data.length < pageSize) break;
  }
  return slugs;
}

/**
 * Restaura do Supabase legado os reviews que faltam no banco atual.
 * @param limit teto de reviews restaurados por invocação (cabe no timeout free)
 */
export async function restoreLegacyReviews(limit = 20): Promise<RestoreResult> {
  const legacy = getLegacyClient();
  if (!legacy) {
    return { ok: false, reason: 'legacy-not-configured' };
  }
  const main = getMainClient();
  if (!main) {
    return { ok: false, reason: 'main-not-configured' };
  }

  // 1) Probe leve: 1 linha, 1 coluna. Barato e revela bloqueio (402).
  const probe = await legacy.from('reviews').select('slug').limit(1);
  if (probe.error) {
    const msg = probe.error.message || '';
    const blocked = /restricted|exceed_egress|402/i.test(msg) || (probe as any).status === 402;
    console.log(`[restore-legacy] Projeto antigo inacessível (${blocked ? 'bloqueado' : 'erro'}): ${msg.slice(0, 160)}`);
    return { ok: false, reason: blocked ? 'legacy-blocked' : 'legacy-error', error: msg.slice(0, 300) };
  }

  // 2) Diff por slug (2 listagens leves)
  let legacySlugs: string[];
  let mainSlugs: string[];
  try {
    [legacySlugs, mainSlugs] = await Promise.all([listAllSlugs(legacy), listAllSlugs(main)]);
  } catch (e: any) {
    return { ok: false, reason: 'list-failed', error: String(e.message || e).slice(0, 300) };
  }
  const mainSet = new Set(mainSlugs);
  const missing = legacySlugs.filter((s) => !mainSet.has(s));
  console.log(`[restore-legacy] Legado=${legacySlugs.length} atual=${mainSlugs.length} faltantes=${missing.length}`);

  if (missing.length === 0) {
    return { ok: true, reason: 'nothing-missing', legacyTotal: legacySlugs.length, mainTotal: mainSlugs.length, missingTotal: 0, restored: 0, restoredSlugs: [] };
  }

  // 3) Busca linhas completas SÓ dos faltantes (lotes pequenos — egress sob controle)
  const batch = missing.slice(0, Math.max(1, Math.min(limit, 50)));
  const rows: Record<string, any>[] = [];
  const fetchSize = 20;
  for (let i = 0; i < batch.length; i += fetchSize) {
    const slice = batch.slice(i, i + fetchSize);
    const { data, error } = await legacy.from('reviews').select('*').in('slug', slice);
    if (error) {
      return { ok: false, reason: 'fetch-failed', error: error.message?.slice(0, 300), legacyTotal: legacySlugs.length, mainTotal: mainSlugs.length, missingTotal: missing.length };
    }
    rows.push(...((data || []) as Record<string, any>[]));
  }

  // 4) Upsert no banco novo (sem id: gera UUID novo; created_at/updated_at preservados)
  const payload = rows.map(pickKnownColumns);
  const { error: upsertError } = await main.from('reviews').upsert(payload, { onConflict: 'slug' });
  if (upsertError) {
    return { ok: false, reason: 'upsert-failed', error: upsertError.message?.slice(0, 300), legacyTotal: legacySlugs.length, mainTotal: mainSlugs.length, missingTotal: missing.length };
  }

  // 5) Espelha no data/reviews.json do GitHub (1 commit; Vercel redeploya sozinha)
  let githubCommitted = false;
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    try {
      const { data: fileReviews, sha } = await fetchFileFromGitHub(token);
      const fileSlugs = new Set((fileReviews as any[]).map((r: any) => r.slug));
      const toAppend = rows
        .filter((r) => r.slug && !fileSlugs.has(r.slug))
        .map((r) => {
          try { return mapToReviewData(r); } catch { return null; }
        })
        .filter(Boolean);
      if (toAppend.length > 0) {
        // Converte ReviewData (camelCase) p/ o formato do arquivo via round-trip simples:
        // o arquivo guarda ReviewData; mapToReviewData já retorna nesse formato.
        await commitFileToGitHub(token, [...(fileReviews as any[]), ...toAppend], sha, `🤖 Restore legacy: ${toAppend.length} reviews do Supabase antigo`);
        githubCommitted = true;
      } else {
        githubCommitted = true; // nada a acrescentar = arquivo já completo
      }
    } catch (e: any) {
      console.warn('[restore-legacy] GitHub sync falhou (não-fatal):', e.message);
    }
  } else {
    console.warn('[restore-legacy] GITHUB_TOKEN ausente: reviews restaurados só no banco.');
  }

  const restoredSlugs = rows.map((r) => String(r.slug)).filter(Boolean);
  console.log(`[restore-legacy] ✅ Restaurados ${restoredSlugs.length}/${missing.length} faltantes.`);
  return {
    ok: true,
    reason: missing.length > batch.length ? 'partial-batch' : 'restored',
    legacyTotal: legacySlugs.length,
    mainTotal: mainSlugs.length,
    missingTotal: missing.length,
    restored: restoredSlugs.length,
    restoredSlugs,
    githubCommitted,
  };
}
