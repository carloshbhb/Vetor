alter table public.seo_action_history
  add column if not exists cycle_status text not null default 'active'
    check (cycle_status in ('new','active','persistent','recurring','resolved_signal','waiting_impact')),
  add column if not exists recurrence_count integer not null default 0,
  add column if not exists resolved_signal_at timestamptz;

create index if not exists seo_action_history_cycle_status_idx
  on public.seo_action_history (cycle_status, updated_at desc);
