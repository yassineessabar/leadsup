-- =====================================================
-- AI-POWERED CAMPAIGNS DATABASE MIGRATION
-- =====================================================
-- This script adds the necessary database schema changes 
-- to support AI-powered campaign creation features.
--
-- Run this in your Supabase SQL Editor to enable full
-- AI campaign functionality.
-- =====================================================

BEGIN;

-- 1. Add missing columns to campaigns table for AI campaign data
-- ============================================================

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS no_website BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS main_activity TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS product_service TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT;

-- 2. Create campaign_ai_assets table for storing AI-generated content
-- ==================================================================

CREATE TABLE IF NOT EXISTS campaign_ai_assets (
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

-- 3. Create indexes for better performance
-- ======================================

DROP INDEX IF EXISTS idx_campaign_ai_assets_campaign_id;
CREATE INDEX idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);

DROP INDEX IF EXISTS idx_campaigns_company_name;
CREATE INDEX idx_campaigns_company_name ON campaigns(company_name);

DROP INDEX IF EXISTS idx_campaigns_location;
CREATE INDEX idx_campaigns_location ON campaigns(location);

DROP INDEX IF EXISTS idx_campaigns_industry;
CREATE INDEX idx_campaigns_industry ON campaigns(industry);

-- 4. Set up Row Level Security (RLS) for campaign_ai_assets
-- ========================================================

ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;

-- Allow users to access AI assets for their own campaigns
-- Drop policy if it exists, then create it (more compatible than IF NOT EXISTS)
DROP POLICY IF EXISTS "Users can access their campaign AI assets" ON campaign_ai_assets;
CREATE POLICY "Users can access their campaign AI assets" 
ON campaign_ai_assets
FOR ALL 
USING (
  campaign_id IN (
    SELECT id FROM campaigns 
    WHERE user_id = auth.uid()
  )
);

-- 5. Add helpful comments for documentation
-- =======================================

COMMENT ON TABLE campaign_ai_assets IS 'Stores AI-generated marketing assets for campaigns including ICPs, personas, pain points, value propositions, and email sequences';

COMMENT ON COLUMN campaign_ai_assets.icps IS 'AI-generated Ideal Customer Profiles in JSON format';
COMMENT ON COLUMN campaign_ai_assets.personas IS 'AI-generated target personas in JSON format';
COMMENT ON COLUMN campaign_ai_assets.pain_points IS 'AI-generated customer pain points in JSON format';
COMMENT ON COLUMN campaign_ai_assets.value_propositions IS 'AI-generated value propositions in JSON format';
COMMENT ON COLUMN campaign_ai_assets.email_sequences IS 'AI-generated email sequences in JSON format';

COMMENT ON COLUMN campaigns.company_name IS 'Company name for AI campaign generation';
COMMENT ON COLUMN campaigns.main_activity IS 'Company main activity description for AI context';
COMMENT ON COLUMN campaigns.keywords IS 'Campaign keywords for prospect targeting';

-- 6. Create updated_at trigger for campaign_ai_assets
-- ==================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_campaign_ai_assets_updated_at ON campaign_ai_assets;
CREATE TRIGGER update_campaign_ai_assets_updated_at 
BEFORE UPDATE ON campaign_ai_assets 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 7. Verification queries (optional - uncomment to check results)
-- ==============================================================

/*
-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('company_name', 'website', 'main_activity', 'keywords', 'location');

-- Check if campaign_ai_assets table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaign_ai_assets' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('campaigns', 'campaign_ai_assets')
AND indexname LIKE '%campaign%';
*/

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- 
-- After running this migration:
-- 
-- ✅ Campaigns can now store company details for AI generation
-- ✅ AI-generated assets are stored in campaign_ai_assets table
-- ✅ Row-level security ensures users only access their own data
-- ✅ Indexes are optimized for better query performance
-- ✅ Triggers maintain updated_at timestamps
--
-- The AI-powered campaign creation feature is now fully
-- supported in your database!
-- =====================================================