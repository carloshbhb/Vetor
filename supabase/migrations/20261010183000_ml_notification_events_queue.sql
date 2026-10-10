create table if not exists public.ml_notification_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  request_id text,
  application_id text not null,
  user_id text,
  topic text not null,
  resource text not null,
  attempts integer not null default 1 check (attempts >= 1),
  sent_at timestamptz,
  source_received_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status = any (array['received'::text, 'processing'::text, 'processed'::text, 'failed'::text])),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists ml_notification_events_status_received_idx
  on public.ml_notification_events (status, received_at);

create index if not exists ml_notification_events_topic_received_idx
  on public.ml_notification_events (topic, received_at desc);

alter table public.ml_notification_events enable row level security;

comment on table public.ml_notification_events is
  'Fila idempotente de notificações recebidas do Mercado Livre; acesso de leitura/escrita somente pelo backend com service role.';
