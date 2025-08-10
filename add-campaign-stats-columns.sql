-- Add campaign statistics columns
-- These columns track email sending stats for each campaign

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS replied_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;

-- Create function to increment sent count
CREATE OR REPLACE FUNCTION increment_campaign_sent_count(campaign_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE campaigns 
    SET 
        sent_count = COALESCE(sent_count, 0) + 1,
        last_activity = NOW()
    WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment failed count  
CREATE OR REPLACE FUNCTION increment_campaign_failed_count(campaign_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE campaigns 
    SET 
        failed_count = COALESCE(failed_count, 0) + 1,
        last_activity = NOW()
    WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

-- Optional: Update existing campaigns with current stats
UPDATE campaigns 
SET sent_count = (
    SELECT COUNT(*) 
    FROM prospect_sequence_progress psp 
    WHERE psp.campaign_id = campaigns.id 
    AND psp.status = 'sent'
),
failed_count = (
    SELECT COUNT(*) 
    FROM prospect_sequence_progress psp 
    WHERE psp.campaign_id = campaigns.id 
    AND psp.status = 'failed'
),
last_activity = (
    SELECT MAX(sent_at) 
    FROM prospect_sequence_progress psp 
    WHERE psp.campaign_id = campaigns.id
);

-- Show current stats
SELECT 
    name as campaign_name,
    status,
    sent_count,
    failed_count,
    last_activity
FROM campaigns 
WHERE status = 'Active'
ORDER BY last_activity DESC;