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
