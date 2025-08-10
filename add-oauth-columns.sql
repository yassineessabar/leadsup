-- Add OAuth2 columns to campaign_senders table
ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS oauth_config JSONB;

-- Update existing records to have auth_type if not set
UPDATE campaign_senders 
SET auth_type = 'app_password' 
WHERE auth_type IS NULL;

-- Show current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'campaign_senders' 
ORDER BY ordinal_position;