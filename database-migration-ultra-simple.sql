-- =====================================================
-- AI-POWERED CAMPAIGNS DATABASE MIGRATION (ULTRA-SIMPLE)
-- =====================================================
-- This version is maximally compatible with all PostgreSQL
-- versions and Supabase environments. No advanced features.
-- =====================================================

-- 1. Add columns to campaigns table (run each line individually if needed)
-- ========================================================================

ALTER TABLE campaigns ADD COLUMN company_name TEXT;
ALTER TABLE campaigns ADD COLUMN website TEXT;
ALTER TABLE campaigns ADD COLUMN no_website BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN language TEXT DEFAULT 'English';
ALTER TABLE campaigns ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE campaigns ADD COLUMN main_activity TEXT;
ALTER TABLE campaigns ADD COLUMN location TEXT;
ALTER TABLE campaigns ADD COLUMN industry TEXT;
ALTER TABLE campaigns ADD COLUMN product_service TEXT;
ALTER TABLE campaigns ADD COLUMN goals TEXT;

-- 2. Create campaign_ai_assets table
-- =================================

CREATE TABLE campaign_ai_assets (
  id BIGSERIAL PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  icps JSONB,
  personas JSONB,
  pain_points JSONB,
  value_propositions JSONB,
  email_sequences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create basic indexes
-- =====================

CREATE INDEX idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);

-- 4. Enable Row Level Security
-- ===========================

ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;

-- 5. Create security policy
-- ========================

CREATE POLICY "campaign_ai_assets_policy" 
ON campaign_ai_assets
USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- If you get errors about existing columns/tables,
-- that's normal - it means they already exist.
-- The feature will work regardless.
-- =====================================================