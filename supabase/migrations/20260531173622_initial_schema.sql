-- ─────────────────────────────────────────────────────────────────────────────
-- Vetor Blog — Supabase Database Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create reviews table
CREATE TABLE reviews (
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
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_category ON reviews(category);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_slug ON reviews(slug);
CREATE INDEX idx_reviews_product ON reviews(product);
CREATE INDEX idx_reviews_google_rank ON reviews(google_rank);

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for search
CREATE INDEX idx_reviews_search ON reviews USING GIN (
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