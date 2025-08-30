-- Add auto_warmup column to campaign_settings table
ALTER TABLE campaign_settings 
ADD COLUMN auto_warmup BOOLEAN DEFAULT false;

-- Update existing records with auto_warmup values from campaigns.settings
UPDATE campaign_settings 
SET auto_warmup = COALESCE((campaigns.settings->>'auto_warmup')::boolean, false)
FROM campaigns 
WHERE campaign_settings.campaign_id = campaigns.id;

-- Add comment for documentation
COMMENT ON COLUMN campaign_settings.auto_warmup IS 'Whether auto warm-up is enabled for this campaign';