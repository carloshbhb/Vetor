create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  normalized_keyword text not null,
  category text,
  intent text not null default 'informacional',
  source text not null default 'system',
  source_count integer not null default 1,
  demand_score numeric(5,2) not null default 0,
  trend_score numeric(5,2) not null default 0,
  commercial_score numeric(5,2) not null default 0,
  competition_score numeric(5,2) not null default 50,
  vetor_fit_score numeric(5,2) not null default 0,
  opportunity_score numeric(5,2) not null default 0,
  trend_direction text not null default 'stable',
  current_impressions integer not null default 0,
  current_clicks integer not null default 0,
  current_ctr numeric(7,4) not null default 0,
  current_position numeric(8,2),
  suggested_route text,
  last_source_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_keyword_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references public.seo_keywords(id) on delete cascade,
  snapshot_date date not null,
  source text not null,
  demand_score numeric(5,2) not null default 0,
  trend_score numeric(5,2) not null default 0,
  commercial_score numeric(5,2) not null default 0,
  competition_score numeric(5,2) not null default 50,
  vetor_fit_score numeric(5,2) not null default 0,
  opportunity_score numeric(5,2) not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  position numeric(8,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(keyword_id, snapshot_date, source)
);

create table if not exists public.market_trend_events (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  term text not null,
  traffic text,
  trend_percent integer,
  started_at timestamptz,
  source text not null default 'google_trends',
  source_url text,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists seo_keywords_opportunity_idx on public.seo_keywords(opportunity_score desc);
create index if not exists seo_keywords_trend_idx on public.seo_keywords(trend_score desc);
create index if not exists seo_keywords_intent_idx on public.seo_keywords(intent);
create index if not exists seo_keywords_normalized_idx on public.seo_keywords(normalized_keyword);
create index if not exists seo_keyword_snapshots_date_idx on public.seo_keyword_snapshots(snapshot_date desc);
create index if not exists market_trend_events_captured_idx on public.market_trend_events(captured_at desc);

alter table public.seo_keywords enable row level security;
alter table public.seo_keyword_snapshots enable row level security;
alter table public.market_trend_events enable row level security;

create or replace function public.touch_seo_keyword_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists seo_keywords_touch_updated_at on public.seo_keywords;
create trigger seo_keywords_touch_updated_at
before update on public.seo_keywords
for each row execute function public.touch_seo_keyword_updated_at();