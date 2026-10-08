-- Phase 12: lock down market-intelligence tables to server-side service-role access only.
-- The admin and cron routes use the Supabase service-role client. Public API roles
-- must not be able to read or write market-intelligence data.

create policy "deny_anon_seo_keywords"
on public.seo_keywords
as restrictive
for all
to anon
using (false)
with check (false);

create policy "deny_authenticated_seo_keywords"
on public.seo_keywords
as restrictive
for all
to authenticated
using (false)
with check (false);

create policy "deny_anon_seo_keyword_snapshots"
on public.seo_keyword_snapshots
as restrictive
for all
to anon
using (false)
with check (false);

create policy "deny_authenticated_seo_keyword_snapshots"
on public.seo_keyword_snapshots
as restrictive
for all
to authenticated
using (false)
with check (false);

create policy "deny_anon_market_trend_events"
on public.market_trend_events
as restrictive
for all
to anon
using (false)
with check (false);

create policy "deny_authenticated_market_trend_events"
on public.market_trend_events
as restrictive
for all
to authenticated
using (false)
with check (false);

alter function public.touch_seo_keyword_updated_at()
set search_path = public;
