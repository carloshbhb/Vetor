-- Add missing `faq` column to reviews table
-- This column was missing from the initial schema but the code expects it
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS faq JSONB NOT NULL DEFAULT '[]'::jsonb;
