alter table public.affiliate_link_ml_matches
  add column if not exists affiliate_generation_status text not null default 'pending'
    check (affiliate_generation_status in ('pending','generated','applied','skipped')),
  add column if not exists generated_affiliate_url text null,
  add column if not exists generated_at timestamptz null,
  add column if not exists generation_notes text null,
  add column if not exists previous_destination_url text null;

create index if not exists affiliate_link_ml_matches_affiliate_status_idx
  on public.affiliate_link_ml_matches (affiliate_generation_status, updated_at desc);
