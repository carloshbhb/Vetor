-- ============================================================
-- FILE: 20240101000000_create_comments_errors_vitals.sql
-- ============================================================
-- Create comments table
-- pg_cron is used by the scheduled cleanups (cron.schedule) below.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Reset de policies (torna o script idempotente: pode rodar quantas vezes quiser)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  review_slug TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  likes INTEGER DEFAULT 0
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_review_id ON comments(review_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('client', 'server')),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(type);

-- Create web_vitals table
CREATE TABLE IF NOT EXISTS web_vitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  delta NUMERIC NOT NULL DEFAULT 0,
  navigation_type TEXT NOT NULL,
  url TEXT NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_web_vitals_timestamp ON web_vitals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_name ON web_vitals(name);

-- Create function to increment likes
CREATE OR REPLACE FUNCTION increment_likes(comment_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE comments SET likes = likes + 1 WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can do everything on comments" ON comments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on error_logs" ON error_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on web_vitals" ON web_vitals
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- FILE: 20240102000000_create_pinterest_tables.sql
-- ============================================================
-- Create pinterest_config table
CREATE TABLE IF NOT EXISTS pinterest_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  board_id TEXT NOT NULL,
  board_name TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pinterest_scheduled_pins table
CREATE TABLE IF NOT EXISTS pinterest_scheduled_pins (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  review_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  pin_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pinterest_pins_status ON pinterest_scheduled_pins(status);
CREATE INDEX IF NOT EXISTS idx_pinterest_pins_scheduled_at ON pinterest_scheduled_pins(scheduled_at);

-- Enable Row Level Security (RLS)
ALTER TABLE pinterest_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinterest_scheduled_pins ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can do everything on pinterest_config" ON pinterest_config
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on pinterest_scheduled_pins" ON pinterest_scheduled_pins
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- FILE: 20240103000000_create_agent_metrics.sql
-- ============================================================
-- 
-- Vetor Blog  Agent Metrics Table
-- 

CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  provider TEXT,
  token_count INTEGER,
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_name ON agent_metrics(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_timestamp ON agent_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_success ON agent_metrics(success);

-- RLS policies (allow service role full access)
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage agent_metrics"
  ON agent_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function: delete metrics older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_agent_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (runs daily)
SELECT cron.schedule(
  'cleanup-agent-metrics',
  '0 4 * * *',
  'SELECT cleanup_old_agent_metrics()'
);

-- ============================================================
-- FILE: 20240103000001_create_ai_citations.sql
-- ============================================================
-- 
-- Vetor Blog  AI Citations Table (GEO Tracking)
-- 

CREATE TABLE IF NOT EXISTS ai_citations (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  query TEXT NOT NULL,
  cited_url TEXT NOT NULL,
  cited_page TEXT NOT NULL,
  context TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_citations_source ON ai_citations(source);
CREATE INDEX IF NOT EXISTS idx_ai_citations_detected_at ON ai_citations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_citations_cited_page ON ai_citations(cited_page);
CREATE INDEX IF NOT EXISTS idx_ai_citations_verified ON ai_citations(verified);

-- RLS policies (allow service role full access)
ALTER TABLE ai_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ai_citations"
  ON ai_citations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function: delete citations older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_ai_citations()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_citations
  WHERE detected_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (runs weekly)
SELECT cron.schedule(
  'cleanup-ai-citations',
  '0 5 * * 0',
  'SELECT cleanup_old_ai_citations()'
);

-- ============================================================
-- FILE: 20240104000000_create_alerts.sql
-- ============================================================
-- 
-- Vetor Blog  Alerts Table
-- 

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_alerts_agent_name ON alerts(agent_name);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

-- RLS policies (allow service role full access)
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage alerts"
  ON alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function: delete alerts older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS void AS $$
BEGIN
  DELETE FROM alerts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (runs daily)
SELECT cron.schedule(
  'cleanup-alerts',
  '0 3 * * *',
  'SELECT cleanup_old_alerts()'
);

-- ============================================================
-- FILE: 20240104000001_create_health_checks.sql
-- ============================================================
-- 
-- Vetor Blog  Health Checks Table (Auto-Healing)
-- 

CREATE TABLE IF NOT EXISTS health_checks (
  component TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success TIMESTAMPTZ,
  last_failure TIMESTAMPTZ,
  action TEXT CHECK (action IN ('retry', 'fallback', 'circuit_break', 'cooldown'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_last_check ON health_checks(last_check DESC);

-- RLS policies (allow service role full access)
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage health_checks"
  ON health_checks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- FILE: 20260531173622_initial_schema.sql
-- ============================================================
-- 
-- Vetor Blog  Supabase Database Schema
-- 

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  product TEXT NOT NULL,
  category TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  price_old TEXT NOT NULL,
  price_new TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  ads_enabled BOOLEAN NOT NULL DEFAULT false,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  meta_keywords TEXT NOT NULL,
  meta_reading_time INTEGER NOT NULL,
  meta_canonical TEXT,
  meta_og_image TEXT,
  hero_headline_line1 TEXT NOT NULL,
  hero_headline_line2 TEXT NOT NULL,
  hero_headline_em TEXT NOT NULL,
  hero_lead TEXT NOT NULL,
  hero_overall_score DECIMAL(3,1) NOT NULL,
  hero_bars JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs JSONB NOT NULL DEFAULT '[]'::jsonb,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  compare_table JSONB NOT NULL DEFAULT '{}'::jsonb,
  pros TEXT[] NOT NULL DEFAULT '{}',
  cons TEXT[] NOT NULL DEFAULT '{}',
  testimonials JSONB NOT NULL DEFAULT '[]'::jsonb,
  verdict_score DECIMAL(3,1) NOT NULL,
  verdict_label TEXT NOT NULL,
  verdict_text TEXT NOT NULL,
  verdict_note TEXT NOT NULL,
  schema_rating_value DECIMAL(3,1) NOT NULL,
  schema_review_count INTEGER NOT NULL,
  google_rank INTEGER,
  last_rank_check TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_category ON reviews(category);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product);
CREATE INDEX IF NOT EXISTS idx_reviews_google_rank ON reviews(google_rank);

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for search
CREATE INDEX IF NOT EXISTS idx_reviews_search ON reviews USING GIN (
  to_tsvector('portuguese', product || ' ' || category || ' ' || meta_title || ' ' || meta_description)
);

-- Create RLS (Row Level Security)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
CREATE POLICY "Public can view published reviews" ON reviews
    FOR SELECT USING (status = 'published');

-- Allow full access to authenticated users
CREATE POLICY "Authenticated users can manage all reviews" ON reviews
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to get published reviews
CREATE OR REPLACE FUNCTION get_published_reviews()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  status TEXT,
  product TEXT,
  category TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_reading_time INTEGER,
  hero_overall_score DECIMAL(3,1),
  ads_enabled BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  google_rank INTEGER,
  last_rank_check TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.slug,
    r.status,
    r.product,
    r.category,
    r.meta_title,
    r.meta_description,
    r.meta_reading_time,
    r.hero_overall_score,
    r.ads_enabled,
    r.created_at,
    r.updated_at,
    r.google_rank,
    r.last_rank_check
  FROM reviews r
  WHERE r.status = 'published'
  ORDER BY r.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get review by slug
CREATE OR REPLACE FUNCTION get_review_by_slug(slug_param TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  status TEXT,
  product TEXT,
  category TEXT,
  marketplace TEXT,
  price_old TEXT,
  price_new TEXT,
  affiliate_url TEXT,
  image_url TEXT,
  ads_enabled BOOLEAN,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  meta_reading_time INTEGER,
  meta_canonical TEXT,
  meta_og_image TEXT,
  hero_headline_line1 TEXT,
  hero_headline_line2 TEXT,
  hero_headline_em TEXT,
  hero_lead TEXT,
  hero_overall_score DECIMAL(3,1),
  hero_bars JSONB,
  specs JSONB,
  sections JSONB,
  compare_table JSONB,
  pros TEXT[],
  cons TEXT[],
  testimonials JSONB,
  verdict_score DECIMAL(3,1),
  verdict_label TEXT,
  verdict_text TEXT,
  verdict_note TEXT,
  schema_rating_value DECIMAL(3,1),
  schema_review_count INTEGER,
  google_rank INTEGER,
  last_rank_check TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.*,
    r.hero_bars,
    r.specs,
    r.sections,
    r.compare_table,
    r.pros,
    r.cons,
    r.testimonials,
    r.schema_rating_value,
    r.schema_review_count
  FROM reviews r
  WHERE r.slug = slug_param AND r.status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FILE: 20260604000000_add_faq_column.sql
-- ============================================================
-- Add missing `faq` column to reviews table
-- This column was missing from the initial schema but the code expects it
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS faq JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- FILE: 20260906000000_create_video_jobs.sql
-- ============================================================
-- Fila de vdeos (backlog 6/dia + reviews novos do dia)
-- Roda com: npx supabase db push  (ou aplique no SQL Editor do Supabase)

CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'script_ready'
    CHECK (status IN ('script_ready','rendering','ready_mp4','published','failed')),
  script JSONB NOT NULL DEFAULT '{}'::jsonb,
  youtube_video_id TEXT,
  youtube_url TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_slug ON video_jobs(slug);

ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages video jobs" ON video_jobs;
CREATE POLICY "Service role manages video jobs" ON video_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FILE: 20260908000000_create_ml_tokens.sql
-- ============================================================
-- Tabela para armazenar tokens do Mercado Livre (OAuth)
-- Usada pelo cron de renovao automtica (a cada 5h, antes da expirao de 6h)
CREATE TABLE IF NOT EXISTS ml_tokens (
  id TEXT PRIMARY KEY DEFAULT 'current',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ndice para consultas por expirao (cron de renovao)
CREATE INDEX IF NOT EXISTS idx_ml_tokens_expires_at ON ml_tokens(expires_at);

-- RLS: apenas service role acessa
ALTER TABLE ml_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on ml_tokens" ON ml_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- FILE: 20260909000000_add_render_engine.sql
-- ============================================================
-- Adiciona coluna render_engine para suportar mltiplos renderizadores
-- ffmpeg (padro, 30/dia) e remotion (premium, 1/dia)
ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS render_engine TEXT DEFAULT 'ffmpeg'
  CHECK (render_engine IN ('ffmpeg', 'remotion'));

CREATE INDEX IF NOT EXISTS idx_video_jobs_render_engine ON video_jobs(render_engine);

-- ============================================================
-- FILE: 20260911000000_create_product_pool.sql
-- ============================================================
-- Vetor Blog  MAS: product_pool table
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS product_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product TEXT NOT NULL,
  category TEXT NOT NULL,
  keyword_score NUMERIC DEFAULT 0,
  search_volume TEXT,
  seo_difficulty TEXT,
  trend_source TEXT,
  priority NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_product_pool_status_priority ON product_pool (status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_product_pool_status_processed ON product_pool (status, processed_at);
CREATE INDEX IF NOT EXISTS idx_product_pool_product ON product_pool (product);

ALTER TABLE product_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON product_pool
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- FILE: 20260912000000_add_video_jobs_columns.sql
-- ============================================================
-- Colunas adicionais usadas pelo lib/video-queue.ts (premium/viral scores)
-- e pelo pipeline remotion. Previne PGRST204 no upsert de video_jobs.
ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS packaging_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS viral_score NUMERIC,
  ADD COLUMN IF NOT EXISTS ctr_estimate NUMERIC,
  ADD COLUMN IF NOT EXISTS hook_score NUMERIC,
  ADD COLUMN IF NOT EXISTS retention_score NUMERIC,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_source ON video_jobs(source);

-- ============================================================================
-- Defesas contra egress (economia de banda no plano free)
-- Consultas "SELECT *" de todas as linhas geram ~2 MB por request. Estas
-- funes SECURITY DEFINER retornam APENAS as colunas de vitrine, ento o
-- payload cai para poucos KB   uma trava no banco, independente do cdigo.
-- ============================================================================

-- 1) Cards de vitrine (home, sitemap, RSS, categoria, relacionados)
--    ~12 colunas texto curto por linha (vs dezenas de KB de specs/sections/faq).
DROP FUNCTION IF EXISTS public.get_review_cards();
CREATE OR REPLACE FUNCTION public.get_review_cards()
RETURNS TABLE (
  id uuid,
  slug text,
  product text,
  category text,
  price_new text,
  image_url text,
  hero_overall_score numeric,
  hero_lead text,
  meta_title text,
  meta_description text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.slug, r.product, r.category, r.price_new, r.image_url,
         r.hero_overall_score, r.hero_lead, r.meta_title, r.meta_description,
         r.created_at, r.updated_at
  FROM reviews r
  WHERE r.status = 'published'
  ORDER BY r.created_at DESC;
$$;

-- 2) Resumos para listas administrativas/research (sem specs/sections/faq)
DROP FUNCTION IF EXISTS public.get_review_summaries();
CREATE OR REPLACE FUNCTION public.get_review_summaries()
RETURNS TABLE (
  id uuid,
  slug text,
  status text,
  product text,
  category text,
  meta_title text,
  meta_description text,
  meta_keywords text,
  meta_reading_time integer,
  meta_canonical text,
  meta_og_image text,
  hero_headline_line1 text,
  hero_headline_line2 text,
  hero_headline_em text,
  hero_lead text,
  hero_overall_score numeric,
  hero_bars jsonb,
  ads_enabled boolean,
  created_at timestamptz,
  updated_at timestamptz,
  google_rank integer,
  last_rank_check timestamp
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.slug, r.status, r.product, r.category,
         r.meta_title, r.meta_description, r.meta_keywords, r.meta_reading_time,
         r.meta_canonical, r.meta_og_image,
         r.hero_headline_line1, r.hero_headline_line2, r.hero_headline_em,
         r.hero_lead, r.hero_overall_score, r.hero_bars,
         r.ads_enabled, r.created_at, r.updated_at,
         r.google_rank, r.last_rank_check
  FROM reviews r
  ORDER BY r.created_at DESC;
$$;

-- 3) Comforto: permite que o app pea APENAS estas colunas via REST tambm
COMMENT ON FUNCTION public.get_review_cards() IS 'Cards leves p/ vitrine (home/sitemap/rss/categoria). Retorna s colunas de listagem p/ no estourar egress.';
COMMENT ON FUNCTION public.get_review_summaries() IS 'Resumos leves de reviews (admin/research) sem JSONB pesados.';
