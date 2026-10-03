-- Consolidate legacy product links and comparative product redirects into the central affiliate registry.
insert into public.affiliate_links
  (slug, name, marketplace, category, source_type, source_ref, destination_url, status, priority, notes, tags, created_at, updated_at)
select
  trim(p.slug),
  coalesce(nullif(trim(p.product_name), ''), trim(p.slug)),
  coalesce(nullif(trim(p.marketplace), ''), 'Outro'),
  coalesce(nullif(trim(p.category), ''), ''),
  'product_link',
  'legacy-product-link:' || p.id::text,
  trim(p.affiliate_url),
  case when lower(coalesce(p.status, '')) = 'archived' then 'archived' else 'active' end,
  coalesce(p.priority, 0),
  'Migrado automaticamente de public.product_links.' ||
    case when coalesce(trim(p.notes), '') <> '' then ' ' || trim(p.notes) else '' end,
  coalesce(p.tags, '{}'),
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
from public.product_links p
where coalesce(trim(p.slug), '') <> ''
  and coalesce(trim(p.affiliate_url), '') ~* '^https://'
on conflict (slug) do nothing;

with comparison_candidates as (
  select
    va.slug as article_slug,
    va.category,
    t.ordinality as position,
    coalesce(
      nullif(trim(t.item->>'name'), ''),
      'Produto ' || t.ordinality::text
    ) as name,
    trim(t.item->>'product_url') as destination_url
  from public.viral_articles va
  cross join lateral jsonb_array_elements(coalesce(va.products, '[]'::jsonb))
    with ordinality as t(item, ordinality)
  where coalesce(trim(t.item->>'product_url'), '') ~* '^https://'
)
insert into public.affiliate_links
  (slug, name, marketplace, category, source_type, source_ref, destination_url, status, priority, notes, tags)
select
  c.article_slug || '-p' || c.position::text,
  c.name,
  'Mercado Livre',
  coalesce(nullif(trim(c.category), ''), ''),
  'comparison_product',
  'comparativo:' || c.article_slug || '#' || c.position::text,
  c.destination_url,
  'active',
  50,
  'Migrado automaticamente do comparativo. Edite o destino na Central de Afiliados.',
  array['comparativo']
from comparison_candidates c
on conflict (slug) do nothing;
