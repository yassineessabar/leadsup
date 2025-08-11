-- =====================================================
-- SAFE DATABASE MIGRATION - HANDLES EXISTING COLUMNS
-- =====================================================
-- This script safely adds missing columns without errors
-- if columns already exist.
-- =====================================================

-- Add missing columns to campaigns table (safe approach)
-- =====================================================

DO $$ 
BEGIN
    -- Add company_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'company_name') THEN
        ALTER TABLE campaigns ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name column';
    ELSE
        RAISE NOTICE 'company_name column already exists';
    END IF;

    -- Add website if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'website') THEN
        ALTER TABLE campaigns ADD COLUMN website TEXT;
        RAISE NOTICE 'Added website column';
    ELSE
        RAISE NOTICE 'website column already exists';
    END IF;

    -- Add no_website if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'no_website') THEN
        ALTER TABLE campaigns ADD COLUMN no_website BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added no_website column';
    ELSE
        RAISE NOTICE 'no_website column already exists';
    END IF;

    -- Add language if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'language') THEN
        ALTER TABLE campaigns ADD COLUMN language TEXT DEFAULT 'English';
        RAISE NOTICE 'Added language column';
    ELSE
        RAISE NOTICE 'language column already exists';
    END IF;

    -- Add keywords if it doesn't exist (MOST IMPORTANT!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'keywords') THEN
        ALTER TABLE campaigns ADD COLUMN keywords JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added keywords column - THIS IS KEY!';
    ELSE
        RAISE NOTICE 'keywords column already exists';
    END IF;

    -- Add main_activity if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'main_activity') THEN
        ALTER TABLE campaigns ADD COLUMN main_activity TEXT;
        RAISE NOTICE 'Added main_activity column';
    ELSE
        RAISE NOTICE 'main_activity column already exists';
    END IF;

    -- Add location if it doesn't exist (IMPORTANT!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'location') THEN
        ALTER TABLE campaigns ADD COLUMN location TEXT;
        RAISE NOTICE 'Added location column - THIS IS KEY!';
    ELSE
        RAISE NOTICE 'location column already exists';
    END IF;

    -- Add industry if it doesn't exist (IMPORTANT!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'industry') THEN
        ALTER TABLE campaigns ADD COLUMN industry TEXT;
        RAISE NOTICE 'Added industry column - THIS IS KEY!';
    ELSE
        RAISE NOTICE 'industry column already exists';
    END IF;

    -- Add product_service if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'product_service') THEN
        ALTER TABLE campaigns ADD COLUMN product_service TEXT;
        RAISE NOTICE 'Added product_service column';
    ELSE
        RAISE NOTICE 'product_service column already exists';
    END IF;

    -- Add goals if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'goals') THEN
        ALTER TABLE campaigns ADD COLUMN goals TEXT;
        RAISE NOTICE 'Added goals column';
    ELSE
        RAISE NOTICE 'goals column already exists';
    END IF;

    -- Add target_audience if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'target_audience') THEN
        ALTER TABLE campaigns ADD COLUMN target_audience TEXT;
        RAISE NOTICE 'Added target_audience column';
    ELSE
        RAISE NOTICE 'target_audience column already exists';
    END IF;

END $$;

-- Create campaign_ai_assets table (safe approach)
-- ==============================================

DO $$ 
BEGIN
    -- Check if table exists
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
        RAISE NOTICE 'Created campaign_ai_assets table';
        
        -- Create index
        CREATE INDEX idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);
        RAISE NOTICE 'Created index on campaign_ai_assets';
        
        -- Enable RLS
        ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on campaign_ai_assets';
        
        -- Create policy
        CREATE POLICY "campaign_ai_assets_policy" ON campaign_ai_assets
        USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
        RAISE NOTICE 'Created RLS policy on campaign_ai_assets';
    ELSE
        RAISE NOTICE 'campaign_ai_assets table already exists';
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- This script safely adds only missing columns/tables.
-- Check the output messages to see what was added.
-- =====================================================