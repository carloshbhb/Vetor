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