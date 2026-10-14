alter table public.pinterest_config
  add column if not exists refresh_token text,
  add column if not exists refresh_token_expires_at timestamptz,
  add column if not exists scopes text,
  add column if not exists token_type text;

alter table public.pinterest_scheduled_pins
  add column if not exists content_type text not null default 'review',
  add column if not exists link_url text,
  add column if not exists attempts integer not null default 0,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.pinterest_scheduled_pins
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.pinterest_scheduled_pins
  drop constraint if exists pinterest_scheduled_pins_status_check;

alter table public.pinterest_scheduled_pins
  add constraint pinterest_scheduled_pins_status_check
  check (status in ('pending', 'publishing', 'published', 'failed'));

alter table public.pinterest_scheduled_pins
  drop constraint if exists pinterest_scheduled_pins_content_type_check;

alter table public.pinterest_scheduled_pins
  add constraint pinterest_scheduled_pins_content_type_check
  check (content_type in ('review', 'lp'));

create unique index if not exists pinterest_scheduled_pins_review_slug_uidx
  on public.pinterest_scheduled_pins (review_slug);

create index if not exists pinterest_scheduled_pins_due_idx
  on public.pinterest_scheduled_pins (scheduled_at asc)
  where status = 'pending';

alter table public.pinterest_config enable row level security;
alter table public.pinterest_scheduled_pins enable row level security;

revoke all on table public.pinterest_config from anon, authenticated;
revoke all on table public.pinterest_scheduled_pins from anon, authenticated;
grant all on table public.pinterest_config to service_role;
grant all on table public.pinterest_scheduled_pins to service_role;
