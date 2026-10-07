-- Persist the OAuth scope and make user_id safe for upsert-based sessions.
alter table if exists public.ml_tokens
  add column if not exists scope text;

create unique index if not exists ml_tokens_user_id_uidx
  on public.ml_tokens(user_id);
