-- Add warm-up tracking columns to campaign_senders table
ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS last_warmup_sent timestamp with time zone,
ADD COLUMN IF NOT EXISTS warmup_phase integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS warmup_days_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS warmup_emails_sent_today integer DEFAULT 0;

-- Add settings column to campaigns table if it doesn't exist
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_senders_warmup 
ON campaign_senders(campaign_id, is_selected, health_score) 
WHERE is_selected = true;

-- Add comment to document the purpose
COMMENT ON COLUMN campaign_senders.last_warmup_sent IS 'Timestamp of the last warm-up email sent for this sender';
COMMENT ON COLUMN campaign_senders.warmup_phase IS 'Current warm-up phase (1: Foundation 1-7 days, 2: Engagement 8-21 days, 3: Scale Up 22-35 days)';
COMMENT ON COLUMN campaign_senders.warmup_days_completed IS 'Total number of days warm-up has been active';
COMMENT ON COLUMN campaign_senders.warmup_emails_sent_today IS 'Number of warm-up emails sent today';
COMMENT ON COLUMN campaigns.settings IS 'JSON settings including auto_warmup flag';