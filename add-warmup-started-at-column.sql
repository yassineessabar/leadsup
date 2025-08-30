-- Add warmup_started_at column to track when warmup actually began
ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS warmup_started_at timestamp with time zone;

-- Add comment to explain the column
COMMENT ON COLUMN campaign_senders.warmup_started_at IS 'Timestamp when warmup process actually started for this sender';

-- Update existing active warmup senders to set warmup_started_at based on when they were last updated
-- This is a one-time migration to set initial values
UPDATE campaign_senders 
SET warmup_started_at = updated_at 
WHERE warmup_status = 'active' 
  AND warmup_started_at IS NULL;