create table if not exists public.affiliate_link_ml_matches (
  id uuid primary key default gen_random_uuid(),
  affiliate_link_id uuid not null unique references public.affiliate_links(id) on delete cascade,
  search_query text not null,
  marketplace_site text not null default 'MLB',
  matched_item_id text null,
  matched_product_id text null,
  matched_title text null,
  matched_url text null,
  sold_quantity integer null,
  rank_position integer null,
  match_score numeric(6,5) null,
  match_status text not null default 'pending'
    check (match_status in ('pending','matched','review','no_match','error')),
  checked_at timestamptz null,
  error_message text null,
  candidate_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.affiliate_link_ml_matches enable row level security;
revoke all on table public.affiliate_link_ml_matches from anon, authenticated;
grant select, insert, update, delete on table public.affiliate_link_ml_matches to service_role;

create index if not exists affiliate_link_ml_matches_status_idx
  on public.affiliate_link_ml_matches (match_status, updated_at desc);
create index if not exists affiliate_link_ml_matches_sold_idx
  on public.affiliate_link_ml_matches (sold_quantity desc nulls last);
create index if not exists affiliate_link_ml_matches_checked_idx
  on public.affiliate_link_ml_matches (checked_at desc);
create index if not exists affiliate_link_ml_matches_query_idx
  on public.affiliate_link_ml_matches (search_query);
