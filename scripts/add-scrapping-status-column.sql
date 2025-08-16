-- Add scrapping_status column to campaigns table
-- This allows tracking of scraping status (Active/Inactive) for each campaign

DO $$ 
BEGIN
    -- Add scrapping_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'scrapping_status'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN scrapping_status VARCHAR(20) DEFAULT 'Inactive' CHECK (scrapping_status IN ('Active', 'Inactive'));
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_campaigns_scrapping_status ON campaigns(scrapping_status);
        
        RAISE NOTICE 'Added scrapping_status column to campaigns table';
    ELSE
        RAISE NOTICE 'scrapping_status column already exists in campaigns table';
    END IF;
END $$;