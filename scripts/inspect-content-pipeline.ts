/**
 * Inspeção read-only do pipeline de conteúdo.
 *
 * Responde, sem alterar nada:
 * - o draft mais recente foi realmente persistido e com qual conteúdo;
 * - quanto conteúdo existe em cada estado (draft/published);
 * - como está a fila de afiliados (por source_type e status);
 * - quantos candidatos ainda aguardam matching.
 */
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';

type Row = Record<string, unknown>;

function countWords(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return value.split(/\s+/).filter(Boolean).length;
}

function countHeadings(value: unknown): number {
  if (typeof value !== 'string') return 0;
  return (value.match(/^#{2,3}\s/gm) || []).length;
}

async function main() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente: a inspeção precisa da service role.');
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select(
      'slug,title,status,content_type,product,created_at,updated_at,content,meta_title,meta_description,hero_lead,faq,specs,pros,cons,sections,notes,affiliate_url'
    )
    .order('updated_at', { ascending: false })
    .limit(5);

  if (reviewsError) throw new Error(`reviews: ${reviewsError.message}`);

  const { data: stateRows, error: stateError } = await supabase
    .from('reviews')
    .select('status,content_type');

  if (stateError) throw new Error(`reviews state: ${stateError.message}`);

  const stateCounts: Record<string, number> = {};
  for (const row of (stateRows || []) as Row[]) {
    const key = `${row.status || 'null'}/${row.content_type || 'null'}`;
    stateCounts[key] = (stateCounts[key] || 0) + 1;
  }

  const { data: linkRows, error: linkError } = await supabase
    .from('affiliate_links')
    .select('id,name,source_type,status,destination_url,landing_page_slug,priority,updated_at');

  if (linkError) throw new Error(`affiliate_links: ${linkError.message}`);

  const queueCounts: Record<string, number> = {};
  let promotedWithDestination = 0;
  for (const row of (linkRows || []) as Row[]) {
    const key = `${row.source_type || 'null'}/${row.status || 'null'}`;
    queueCounts[key] = (queueCounts[key] || 0) + 1;
    if (row.source_type === 'comparison_product' && String(row.destination_url || '').startsWith('https://')) {
      promotedWithDestination += 1;
    }
  }

  const { data: matchRows, error: matchError } = await supabase
    .from('affiliate_link_ml_matches')
    .select('match_status');

  if (matchError) throw new Error(`affiliate_link_ml_matches: ${matchError.message}`);

  const matchCounts: Record<string, number> = {};
  for (const row of (matchRows || []) as Row[]) {
    const key = String(row.match_status || 'null');
    matchCounts[key] = (matchCounts[key] || 0) + 1;
  }

  const latest = ((reviews || []) as Row[]).map((row) => ({
    slug: row.slug,
    title: row.title,
    status: row.status,
    contentType: row.content_type,
    product: row.product,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    words: countWords(row.content),
    headings: countHeadings(row.content),
    heroLeadChars: typeof row.hero_lead === 'string' ? row.hero_lead.length : 0,
    metaTitleChars: typeof row.meta_title === 'string' ? row.meta_title.length : 0,
    metaDescriptionChars: typeof row.meta_description === 'string' ? row.meta_description.length : 0,
    faqItems: Array.isArray(row.faq) ? row.faq.length : 0,
    specs: Array.isArray(row.specs) ? row.specs.length : 0,
    pros: Array.isArray(row.pros) ? row.pros.length : 0,
    cons: Array.isArray(row.cons) ? row.cons.length : 0,
    hasAffiliateUrl: Boolean(row.affiliate_url),
    notes: typeof row.notes === 'string' ? row.notes.slice(0, 300) : null,
  }));

  const report = {
    inspectedAt: new Date().toISOString(),
    reviews: {
      stateCounts,
      latest,
    },
    affiliateQueue: {
      total: (linkRows || []).length,
      promotedWithDestination,
      queueCounts,
    },
    mlMatches: {
      total: (matchRows || []).length,
      matchCounts,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`inspect-content-pipeline falhou: ${error.message}`);
  process.exitCode = 1;
});
