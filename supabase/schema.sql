-- Vetor Blog Database Schema
-- Run this in your Supabase SQL Editor

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  content text,
  price text,
  category text,
  image text,
  score numeric DEFAULT 0,
  pros jsonb DEFAULT '[]'::jsonb,
  cons jsonb DEFAULT '[]'::jsonb,
  author_name text DEFAULT 'Editor Vetor',
  author_bio text DEFAULT 'Especialista em análise de produtos tech',
  seo_title text,
  seo_description text,
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Viral Articles table
CREATE TABLE IF NOT EXISTS viral_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  content text,
  category text,
  hero jsonb DEFAULT '{}'::jsonb,
  products jsonb DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_category ON reviews(category);
CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_articles_slug ON viral_articles(slug);
CREATE INDEX IF NOT EXISTS idx_viral_articles_category ON viral_articles(category);
CREATE INDEX IF NOT EXISTS idx_viral_articles_published_at ON viral_articles(published_at DESC);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_articles ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for reviews"
  ON reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access for viral_articles"
  ON viral_articles
  FOR SELECT
  USING (true);

-- Authenticated write access policies
CREATE POLICY "Authenticated insert for reviews"
  ON reviews
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update for reviews"
  ON reviews
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete for reviews"
  ON reviews
  FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert for viral_articles"
  ON viral_articles
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update for viral_articles"
  ON viral_articles
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete for viral_articles"
  ON viral_articles
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Video Queue table
CREATE TABLE IF NOT EXISTS video_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_url text NOT NULL,
  product_title text,
  product_category text,
  product_price text,
  product_image_url text,
  affiliate_url text,
  shortened_affiliate_url text,
  script_text text,
  script_hook text,
  voiceover_url text,
  voiceover_duration numeric,
  media_assets jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  error_message text,
  video_url text,
  youtube_video_id text,
  youtube_url text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for video queue
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_queue_created_at ON video_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_queue_scheduled_at ON video_queue(scheduled_at);

-- Enable Row Level Security
ALTER TABLE video_queue ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for video_queue"
  ON video_queue
  FOR SELECT
  USING (true);

-- Authenticated write access policies
CREATE POLICY "Authenticated insert for video_queue"
  ON video_queue
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update for video_queue"
  ON video_queue
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete for video_queue"
  ON video_queue
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Mercado Livre Tokens table
CREATE TABLE IF NOT EXISTS ml_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer UNIQUE NOT NULL,
  access_token text NOT NULL,
  refresh_token text DEFAULT '',
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for ML tokens
CREATE INDEX IF NOT EXISTS idx_ml_tokens_user_id ON ml_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE ml_tokens ENABLE ROW LEVEL SECURITY;

-- Service role access policies (only server can access)
CREATE POLICY "Service role insert for ml_tokens"
  ON ml_tokens
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update for ml_tokens"
  ON ml_tokens
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role select for ml_tokens"
  ON ml_tokens
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role delete for ml_tokens"
  ON ml_tokens
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Mercado Livre Affiliate Links table
CREATE TABLE IF NOT EXISTS ml_affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_url text NOT NULL,
  product_id text,
  product_title text,
  product_category text,
  product_price numeric,
  tracking_url text NOT NULL,
  short_url text,
  campaign text DEFAULT 'vetor_blog',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for affiliate links
CREATE INDEX IF NOT EXISTS idx_ml_affiliate_links_product_id ON ml_affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_ml_affiliate_links_status ON ml_affiliate_links(status);

-- Enable Row Level Security
ALTER TABLE ml_affiliate_links ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for ml_affiliate_links"
  ON ml_affiliate_links
  FOR SELECT
  USING (true);

-- Service role access policies
CREATE POLICY "Service role insert for ml_affiliate_links"
  ON ml_affiliate_links
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update for ml_affiliate_links"
  ON ml_affiliate_links
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role delete for ml_affiliate_links"
  ON ml_affiliate_links
  FOR DELETE
  USING (auth.role() = 'service_role');


-- SEO Action History (admin/server only)
create table if not exists public.seo_action_history (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  signal_type text not null check (signal_type in ('CTR','POSIÇÃO','CANIBALIZAÇÃO','LACUNA')),
  priority text not null check (priority in ('Alta','Média')),
  title text not null,
  detail text not null,
  evidence text not null,
  action text not null,
  source text not null,
  href text not null default '',
  impressions integer not null default 0,
  brief jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','in_progress','done','dismissed')),
  notes text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seo_action_history enable row level security;

revoke all on table public.seo_action_history from anon, authenticated;
grant select, insert, update, delete on table public.seo_action_history to service_role;

create index if not exists seo_action_history_status_updated_idx
  on public.seo_action_history (status, updated_at desc);

create index if not exists seo_action_history_type_impressions_idx
  on public.seo_action_history (signal_type, impressions desc);


-- SEO Action Impact Metrics
alter table public.seo_action_history
  add column if not exists before_impressions integer,
  add column if not exists after_impressions integer,
  add column if not exists before_clicks integer,
  add column if not exists after_clicks integer,
  add column if not exists before_ctr numeric,
  add column if not exists after_ctr numeric,
  add column if not exists before_position numeric,
  add column if not exists after_position numeric,
  add column if not exists impact_status text check (impact_status is null or impact_status in ('waiting','measured','no_data')),
  add column if not exists impact_period_days integer,
  add column if not exists impact_measured_at timestamptz;


-- SEO Action Cycle State
alter table public.seo_action_history
  add column if not exists cycle_status text not null default 'active' check (cycle_status in ('new','active','persistent','recurring','resolved_signal','waiting_impact')),
  add column if not exists recurrence_count integer not null default 0,
  add column if not exists resolved_signal_at timestamptz;

create index if not exists seo_action_history_cycle_status_idx
  on public.seo_action_history (cycle_status, updated_at desc);


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

