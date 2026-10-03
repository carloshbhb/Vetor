-- Hardening do acesso público, RLS, funções e índices.
-- Aplicado em produção no projeto Supabase fzxumynocfqgvrovjuyf em 2026-10-03.

begin;

revoke all on table public.viral_articles from anon, authenticated;
grant select on table public.viral_articles to anon, authenticated;
drop policy if exists "Public can view viral articles" on public.viral_articles;
create policy "Public can view viral articles"
  on public.viral_articles
  for select
  to anon, authenticated
  using (true);

revoke all on table public.reviews from anon, authenticated;
grant select on table public.reviews to anon, authenticated;
drop policy if exists "Authenticated users can manage all reviews" on public.reviews;
drop policy if exists "Public can view published reviews" on public.reviews;
create policy "Public can view published reviews"
  on public.reviews
  for select
  to anon, authenticated
  using (status = 'published');

revoke all on table public.product_links from anon, authenticated;
grant select on table public.product_links to anon, authenticated;
drop policy if exists "Authenticated full access" on public.product_links;
drop policy if exists "Anon read access" on public.product_links;
create policy "Public can read product links"
  on public.product_links
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Service role can do everything on comments" on public.comments;
create policy "Service role can do everything on comments"
  on public.comments for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can do everything on error_logs" on public.error_logs;
create policy "Service role can do everything on error_logs"
  on public.error_logs for all to service_role
  using (true) with check (true);

drop policy if exists "Service role all for ml_affiliate_links" on public.ml_affiliate_links;
create policy "Service role all for ml_affiliate_links"
  on public.ml_affiliate_links for all to service_role
  using (true) with check (true);

drop policy if exists "Service role all for ml_tokens" on public.ml_tokens;
drop policy if exists "Service role can do everything on ml_tokens" on public.ml_tokens;
create policy "Service role all for ml_tokens"
  on public.ml_tokens for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can do everything on pinterest_config" on public.pinterest_config;
create policy "Service role can do everything on pinterest_config"
  on public.pinterest_config for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can do everything on pinterest_scheduled_pins" on public.pinterest_scheduled_pins;
create policy "Service role can do everything on pinterest_scheduled_pins"
  on public.pinterest_scheduled_pins for all to service_role
  using (true) with check (true);

drop policy if exists "Service role full access" on public.product_pool;
create policy "Service role full access"
  on public.product_pool for all to service_role
  using (true) with check (true);

drop policy if exists "Service role can do everything on web_vitals" on public.web_vitals;
create policy "Service role can do everything on web_vitals"
  on public.web_vitals for all to service_role
  using (true) with check (true);

alter function public.get_published_reviews()
  security invoker
  set search_path = public, pg_temp;

alter function public.get_review_by_slug(text)
  security invoker
  set search_path = public, pg_temp;

alter function public.get_review_cards()
  security invoker
  set search_path = public, pg_temp;

alter function public.get_review_summaries()
  security invoker
  set search_path = public, pg_temp;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.cleanup_old_agent_metrics()
  set search_path = public, pg_temp;
revoke execute on function public.cleanup_old_agent_metrics() from public, anon, authenticated;

alter function public.increment_likes(text)
  set search_path = public, pg_temp;

alter function public.cleanup_old_ai_citations()
  set search_path = public, pg_temp;
revoke execute on function public.cleanup_old_ai_citations() from public, anon, authenticated;

alter function public.cleanup_old_alerts()
  set search_path = public, pg_temp;
revoke execute on function public.cleanup_old_alerts() from public, anon, authenticated;

alter function public.update_updated_at_column()
  set search_path = public, pg_temp;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;

create index if not exists idx_video_jobs_review_id
  on public.video_jobs (review_id);

commit;
