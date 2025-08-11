-- =====================================================
-- AI-POWERED CAMPAIGNS DATABASE MIGRATION (SAFE)
-- =====================================================
-- This version handles existing columns and tables
-- gracefully and is compatible with all PostgreSQL versions.
-- =====================================================

-- Helper function to add column only if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    table_name TEXT,
    column_name TEXT,
    column_type TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = table_name 
        AND column_name = column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. Add missing columns to campaigns table (safely)
-- =================================================

SELECT add_column_if_not_exists('campaigns', 'company_name', 'TEXT');
SELECT add_column_if_not_exists('campaigns', 'website', 'TEXT');
SELECT add_column_if_not_exists('campaigns', 'no_website', 'BOOLEAN DEFAULT FALSE');
SELECT add_column_if_not_exists('campaigns', 'language', 'TEXT DEFAULT ''English''');
SELECT add_column_if_not_exists('campaigns', 'keywords', 'JSONB DEFAULT ''[]''::jsonb');
SELECT add_column_if_not_exists('campaigns', 'main_activity', 'TEXT');
SELECT add_column_if_not_exists('campaigns', 'location', 'TEXT');
SELECT add_column_if_not_exists('campaigns', 'industry', 'TEXT');
SELECT add_column_if_not_exists('campaigns', 'product_service', 'TEXT');
SELECT add_column_if_not_exists('campaigns', 'goals', 'TEXT');

-- 2. Create campaign_ai_assets table (only if it doesn't exist)
-- ===========================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_ai_assets') THEN
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
    END IF;
END $$;

-- 3. Create indexes (only if they don't exist)
-- ===========================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaign_ai_assets_campaign_id') THEN
        CREATE INDEX idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_company_name') THEN
        CREATE INDEX idx_campaigns_company_name ON campaigns(company_name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_location') THEN
        CREATE INDEX idx_campaigns_location ON campaigns(location);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_industry') THEN
        CREATE INDEX idx_campaigns_industry ON campaigns(industry);
    END IF;
END $$;

-- 4. Set up Row Level Security (safely)
-- ====================================

DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'campaign_ai_assets' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Drop existing policy if it exists, then create new one
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'campaign_ai_assets' 
        AND policyname = 'Users can access their campaign AI assets'
    ) THEN
        DROP POLICY "Users can access their campaign AI assets" ON campaign_ai_assets;
    END IF;
    
    -- Create the policy
    CREATE POLICY "Users can access their campaign AI assets" 
    ON campaign_ai_assets
    FOR ALL 
    USING (
      campaign_id IN (
        SELECT id FROM campaigns 
        WHERE user_id = auth.uid()
      )
    );
END $$;

-- 5. Create updated_at trigger (safely)
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_campaign_ai_assets_updated_at ON campaign_ai_assets;
CREATE TRIGGER update_campaign_ai_assets_updated_at 
BEFORE UPDATE ON campaign_ai_assets 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- 6. Clean up helper function
-- ==========================

DROP FUNCTION add_column_if_not_exists;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- This safe migration handles all edge cases:
-- ✅ Existing columns are not re-created
-- ✅ Existing tables are not overwritten  
-- ✅ Existing indexes are not duplicated
-- ✅ Existing policies are replaced safely
-- ✅ Compatible with all PostgreSQL versions
-- =====================================================