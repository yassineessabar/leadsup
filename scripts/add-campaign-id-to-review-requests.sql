-- Add campaign_id column to review_requests table to link leads to specific campaigns
-- This allows proper tracking of which campaign a lead belongs to

-- Add the campaign_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'review_requests' 
        AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE review_requests 
        ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL;
        
        -- Add index for better performance
        CREATE INDEX IF NOT EXISTS idx_review_requests_campaign_id 
        ON review_requests(campaign_id);
        
        -- Add index for campaign + user queries
        CREATE INDEX IF NOT EXISTS idx_review_requests_campaign_user 
        ON review_requests(campaign_id, user_id);
        
        RAISE NOTICE 'Added campaign_id column to review_requests table';
    ELSE
        RAISE NOTICE 'campaign_id column already exists in review_requests table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'review_requests' 
AND column_name = 'campaign_id';