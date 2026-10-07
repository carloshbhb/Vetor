-- Consolidate production fixes applied directly to Supabase during Phase A.
-- Safe to re-run: all DDL is guarded where possible.

create table if not exists public.video_queue (
  id uuid primary key default gen_random_uuid(),
  product_url text,
  product_title text,
  category text,
  price numeric,
  image_url text,
  affiliate_url text,
  affiliate_short_url text,
  script text,
  hook text,
  voiceover text,
  media_url text,
  status text not null default 'pending',
  error_message text,
  video_url text,
  youtube_url text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_video_queue_status_scheduled
  on public.video_queue(status, scheduled_at);

create index if not exists idx_video_queue_created_at
  on public.video_queue(created_at);

alter table public.video_queue enable row level security;

create index if not exists idx_video_jobs_review_id
  on public.video_jobs(review_id);

alter function public.increment_likes(text)
  set search_path = public, pg_temp;

alter function public.update_updated_at_column()
  set search_path = public, pg_temp;

revoke execute on function public.update_review_field(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.update_review_json(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.update_review_from_json(uuid, text) from public, anon, authenticated;
