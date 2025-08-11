-- =====================================================
-- AI-POWERED CAMPAIGNS DATABASE MIGRATION (SIMPLE)
-- =====================================================
-- This is a simplified version of the migration that
-- avoids potential compatibility issues with older
-- PostgreSQL versions.
-- =====================================================

-- 1. Add missing columns to campaigns table
-- ==========================================

ALTER TABLE campaigns 
ADD COLUMN company_name TEXT,
ADD COLUMN website TEXT,
ADD COLUMN no_website BOOLEAN DEFAULT FALSE,
ADD COLUMN language TEXT DEFAULT 'English',
ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb,
ADD COLUMN main_activity TEXT,
ADD COLUMN location TEXT,
ADD COLUMN industry TEXT,
ADD COLUMN product_service TEXT,
ADD COLUMN goals TEXT;

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

-- 3. Create indexes
-- ================

CREATE INDEX idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);
CREATE INDEX idx_campaigns_company_name ON campaigns(company_name);
CREATE INDEX idx_campaigns_location ON campaigns(location);
CREATE INDEX idx_campaigns_industry ON campaigns(industry);

-- 4. Set up Row Level Security
-- ===========================

ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own campaign AI assets
CREATE POLICY "Users can access their campaign AI assets" 
ON campaign_ai_assets
FOR ALL 
USING (
  campaign_id IN (
    SELECT id FROM campaigns 
    WHERE user_id = auth.uid()
  )
);

-- 5. Create updated_at trigger
-- ===========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_ai_assets_updated_at 
BEFORE UPDATE ON campaign_ai_assets 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================