-- Central Affiliate Center
create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  marketplace text not null default 'Outro',
  category text not null default '',
  source_type text not null default 'manual'
    check (source_type in ('review','comparison_product','product_link','manual')),
  source_ref text not null default '',
  destination_url text not null,
  status text not null default 'active'
    check (status in ('active','paused','broken','archived')),
  priority integer not null default 0,
  notes text not null default '',
  tags text[] not null default '{}',
  health_status text not null default 'unknown'
    check (health_status in ('unknown','healthy','redirect','error')),
  last_checked_at timestamptz null,
  http_status integer null,
  final_url text null,
  last_error text null,
  total_clicks integer not null default 0,
  last_clicked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.affiliate_links enable row level security;
revoke all on table public.affiliate_links from anon, authenticated;
grant select, insert, update, delete on table public.affiliate_links to service_role;

create index if not exists affiliate_links_status_priority_idx on public.affiliate_links (status, priority desc);
create index if not exists affiliate_links_marketplace_idx on public.affiliate_links (marketplace);
create index if not exists affiliate_links_source_idx on public.affiliate_links (source_type, source_ref);
create index if not exists affiliate_links_health_idx on public.affiliate_links (health_status, last_checked_at);

create table if not exists public.affiliate_clicks (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.affiliate_links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer_path text null
);

alter table public.affiliate_clicks enable row level security;
revoke all on table public.affiliate_clicks from anon, authenticated;
grant select, insert, update, delete on table public.affiliate_clicks to service_role;

create index if not exists affiliate_clicks_link_clicked_idx on public.affiliate_clicks (link_id, clicked_at desc);
create index if not exists affiliate_clicks_clicked_idx on public.affiliate_clicks (clicked_at desc);

create or replace function public.increment_affiliate_link_click(p_link_id uuid)
returns void
language sql
set search_path = public
as $$
  update public.affiliate_links
  set total_clicks = total_clicks + 1,
      last_clicked_at = now(),
      updated_at = now()
  where id = p_link_id;
$$;

revoke execute on function public.increment_affiliate_link_click(uuid) from public, anon, authenticated;
grant execute on function public.increment_affiliate_link_click(uuid) to service_role;

insert into public.affiliate_links
  (slug, name, marketplace, category, source_type, source_ref, destination_url, status, priority, notes)
select
  r.slug,
  r.product,
  coalesce(nullif(r.marketplace,''),'Outro'),
  coalesce(r.category,''),
  'review',
  r.slug,
  r.affiliate_url,
  'active',
  100,
  'Importado automaticamente do cadastro de reviews.'
from public.reviews r
where r.status='published'
  and coalesce(trim(r.affiliate_url),'') <> ''
on conflict (slug) do nothing;
