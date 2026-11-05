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

type Section = { heading?: unknown; content?: unknown };

function sectionWords(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return (value as Section[]).reduce((sum, section) => sum + countWords(section?.content), 0);
}

function sectionHeadings(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return (value as Section[]).filter((section) => typeof section?.heading === 'string' && section.heading.trim()).length;
}

async function main() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente: a inspeção precisa da service role.');
  }

  // A tabela de produção não tem "title" nem "notes": o produto fica em
  // "product" e o corpo do review em "sections" (JSONB).
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select(
      'slug,status,content_type,product,category,marketplace,created_at,updated_at,meta_title,meta_description,hero_lead,faq,specs,pros,cons,sections,hero_bars,verdict_score,verdict_label,affiliate_url,price_new,image_url'
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
    .select('id,name,source_type,status,destination_url,priority,updated_at');

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

  // A fila consumida pelo gerador de reviews vive em product_links.
  const { data: productLinkRows, error: productLinkError } = await supabase
    .from('product_links')
    .select('id,product_name,status,has_review,landing_page_slug,notes,updated_at');

  if (productLinkError) throw new Error(`product_links: ${productLinkError.message}`);

  const productLinkCounts: Record<string, number> = {};
  let eligibleForReview = 0;
  let lockedByLandingPage = 0;
  for (const row of (productLinkRows || []) as Row[]) {
    const key = `${row.status || 'null'}/has_review=${row.has_review === true ? 'yes' : 'no'}`;
    productLinkCounts[key] = (productLinkCounts[key] || 0) + 1;
    if (String(row.landing_page_slug || '').trim()) lockedByLandingPage += 1;
    if (row.status === 'active' && row.has_review !== true && !String(row.landing_page_slug || '').trim()) {
      eligibleForReview += 1;
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

  // Os virais vivem em outra tabela e não aparecem em reviews. Sem esta leitura
  // é impossível saber se o cron das 06:00 UTC publicou ou falhou no quality gate.
  const { data: viralRows, error: viralError } = await supabase
    .from('viral_articles')
    .select('slug,title,category,published_at,created_at,updated_at')
    .order('published_at', { ascending: false })
    .limit(5);

  if (viralError) throw new Error(`viral_articles: ${viralError.message}`);

  const { count: viralTotal, error: viralCountError } = await supabase
    .from('viral_articles')
    .select('id', { count: 'exact', head: true });

  if (viralCountError) throw new Error(`viral_articles count: ${viralCountError.message}`);

  const latest = ((reviews || []) as Row[]).map((row) => ({
    slug: row.slug,
    product: row.product,
    status: row.status,
    contentType: row.content_type,
    category: row.category,
    marketplace: row.marketplace,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    words: sectionWords(row.sections),
    headings: sectionHeadings(row.sections),
    heroLeadChars: typeof row.hero_lead === 'string' ? row.hero_lead.length : 0,
    metaTitleChars: typeof row.meta_title === 'string' ? row.meta_title.length : 0,
    metaDescriptionChars: typeof row.meta_description === 'string' ? row.meta_description.length : 0,
    faqItems: Array.isArray(row.faq) ? row.faq.length : 0,
    specs: Array.isArray(row.specs) ? row.specs.length : 0,
    heroBars: Array.isArray(row.hero_bars) ? row.hero_bars.length : 0,
    pros: Array.isArray(row.pros) ? row.pros.length : 0,
    cons: Array.isArray(row.cons) ? row.cons.length : 0,
    verdictScore: row.verdict_score,
    verdictLabel: row.verdict_label,
    price: row.price_new,
    hasImage: Boolean(row.image_url),
    hasAffiliateUrl: Boolean(row.affiliate_url),
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
    reviewQueue: {
      total: (productLinkRows || []).length,
      eligibleForReview,
      lockedByLandingPage,
      productLinkCounts,
    },
    mlMatches: {
      total: (matchRows || []).length,
      matchCounts,
    },
    viralArticles: {
      total: viralTotal ?? null,
      latest: ((viralRows || []) as Row[]).map((row) => ({
        slug: row.slug,
        title: row.title,
        category: row.category,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      })),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`inspect-content-pipeline falhou: ${error.message}`);
  process.exitCode = 1;
});
