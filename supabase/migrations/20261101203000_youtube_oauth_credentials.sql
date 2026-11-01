-- Store the latest YouTube OAuth consent server-side.
-- Client-side roles cannot read or write this table; only service_role may access it.
create table if not exists public.youtube_oauth_credentials (
  provider text primary key check (provider = 'youtube'),
  refresh_token text not null,
  granted_scopes text not null default '',
  channel_id text,
  channel_title text,
  updated_at timestamptz not null default now()
);

alter table public.youtube_oauth_credentials enable row level security;
revoke all on table public.youtube_oauth_credentials from anon, authenticated;
grant all on table public.youtube_oauth_credentials to service_role;

comment on table public.youtube_oauth_credentials is
  'Server-only OAuth refresh tokens for connected publishing providers; no client RLS policies.';
