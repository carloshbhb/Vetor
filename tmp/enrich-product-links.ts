/**
 * Enrich product_links with image + canonical URL via ML products API (by name search).
 * Stored MLB IDs in product_url are unreliable — do not trust them for lookup.
 *
 * NOTE on price: the ML Product API (/products, /products/search) does NOT expose price.
 * Verified: /products/{id} has no `price`, `buy_box_winner` is null, `pickers[].products[]`
 * is empty of price, /products/{id}/items -> 404, /items/{id} -> 403. Price would require
 * the legacy item search which ML now blocks. So price is left untouched.
 *
 * Only ONE API call per product (search) — /products/{id} adds nothing the search lacks.
 * Usage: npx tsx tmp/enrich-product-links.ts [--dry] [--limit=N] [--min-score=0.55]
 */
import { config } from 'dotenv';
import { getValidAccessToken } from '../src/lib/mercadolivre-auth';
import { getAllProductLinks, updateProductLink } from '../src/lib/product-links';
import { fuzzyScore } from './fuzzy-score';

config({ path: '.env.local' });

const dryRun = process.argv.includes('--dry');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const scoreArg = process.argv.find((a) => a.startsWith('--min-score='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 100;
const MIN_SCORE = scoreArg ? Number(scoreArg.split('=')[1]) : 0.9;
const SLEEP_MS = 1300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** True when both URLs point at the same ML asset, ignoring size suffix and host. */
function sameImage(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const key = (u: string) => {
    const file = u.split('/').pop() || '';
    return file.replace(/-[A-Z]\.jpg$/i, '').replace(/\.(jpe?g|png|webp)$/i, '');
  };
  return key(a) === key(b);
}

function pickImage(p: any): string | null {
  // /products/search returns pictures[] with `url` only (no secure_url)
  for (const pic of p?.pictures || []) {
    const u = pic.secure_url || pic.url;
    if (u) return u;
  }
  if (p?.thumbnail) return p.thumbnail;
  return null;
}

function toTrackingUrl(url: string): string {
  if (!url) return url;
  const tracking = process.env.ML_TRACKING_ID || 'carloshbhb';
  try {
    const u = new URL(url);
    if (!u.hostname.includes('mercadolivre.com') && !u.hostname.includes('meli.')) return url;
    u.searchParams.set('matt_tool', tracking);
    u.searchParams.set('matt_word', 'vetorblog');
    u.searchParams.set('ref', tracking);
    u.searchParams.set('tracking_id', tracking);
    return u.toString();
  } catch {
    return url;
  }
}

async function mlGet<T>(path: string, token: string): Promise<{ status: number; body: T | null; rate: boolean }> {
  const r = await fetch(`https://api.mercadolibre.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (r.status === 429) return { status: 429, body: null, rate: true };
  if (!r.ok) return { status: r.status, body: null, rate: false };
  return { status: r.status, body: (await r.json()) as T, rate: false };
}

async function withRetry<T>(fn: () => Promise<{ status: number; body: T | null; rate: boolean }>): Promise<{ status: number; body: T | null }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fn();
    if (!res.rate) return { status: res.status, body: res.body };
    const wait = 4000 * (attempt + 1);
    console.log(`  rate limited, waiting ${wait}ms...`);
    await sleep(wait);
  }
  return { status: 429, body: null };
}

async function main() {
  const token = await getValidAccessToken();
  const links = await getAllProductLinks({ status: 'active', limit: LIMIT });
  console.log(`dryRun=${dryRun} minScore=${MIN_SCORE} links=${links.length}\n`);

  const stats = { ok: 0, updated: 0, skip: 0, noMatch: 0, err: 0, rate: 0 };
  let i = 0;

  for (const l of links) {
    i++;
    const prefix = `[${i}/${links.length}] ${l.slug}`;

    if (!l.product_name || l.product_name.length < 4) {
      console.log(`${prefix} skip: short name`);
      stats.skip++;
      continue;
    }

    const search = await withRetry(() =>
      mlGet<any>(
        `/products/search?q=${encodeURIComponent(l.product_name)}&site_id=MLB&status=active&limit=5`,
        token
      )
    );
    await sleep(SLEEP_MS);

    if (search.status === 429) {
      console.log(`${prefix} RATE`);
      stats.rate++;
      continue;
    }
    if (search.status !== 200 || !search.body) {
      console.log(`${prefix} search HTTP ${search.status}`);
      stats.err++;
      continue;
    }

    const results: any[] = search.body.results || [];
    let best: any = null;
    let bestScore = 0;
    for (const r of results) {
      if (r.status !== 'active') continue;
      const s = fuzzyScore(l.product_name, r.name || r.family_name || '');
      if (s > bestScore) {
        best = r;
        bestScore = s;
      }
    }

    if (!best || bestScore < MIN_SCORE) {
      console.log(`${prefix} noMatch best=${bestScore.toFixed(2)} cand=${best ? (best.name || '').slice(0, 50) : '-'}`);
      stats.noMatch++;
      continue;
    }

    // The search response already carries everything we need (id, name, status, pictures).
    // A follow-up /products/{id} call adds no usable data and doubles API quota, so skip it.
    const img = pickImage(best);
    const newProductId = String(best.id);

    // /products/search never returns permalink, so build the canonical /p/{id} URL.
    const baseProductUrl = `https://www.mercadolivre.com.br/p/${newProductId}`;
    const newAffiliate = toTrackingUrl(baseProductUrl);

    const patch: Record<string, unknown> = {};
    if (img && !sameImage(l.image_url, img)) patch.image_url = img;
    const oldIdMatch = (l.product_url || '').match(/MLB\d+/);
    const oldId = oldIdMatch ? oldIdMatch[0] : null;
    const idChanged = oldId !== newProductId;
    if (idChanged) {
      patch.product_url = baseProductUrl;
      patch.affiliate_url = newAffiliate;
    }
    if (l.marketplace && l.marketplace !== 'mercadolivre') patch.marketplace = 'mercadolivre';

    const willUpdate = Object.keys(patch).length > 0;
    console.log(
      `${prefix} match score=${bestScore.toFixed(2)} id=${newProductId}${idChanged ? ' (ID_CHANGE)' : ''} img=${img ? (sameImage(l.image_url, img) ? 'same' : 'NEW') : 'n'} ${willUpdate ? (dryRun ? 'DRY_UPDATE' : 'UPDATE') : 'noop'} :: ${(best.name || '').slice(0, 60)}`
    );

    if (willUpdate) {
      stats.updated++;
      if (!dryRun) {
        const { error } = await updateProductLink(l.id, patch as any);
        if (error) {
          console.log(`  update error: ${error}`);
          stats.err++;
          stats.updated--;
        }
      }
    } else {
      stats.ok++;
    }
  }

  console.log('\n--- summary ---');
  console.log(stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
