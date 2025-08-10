-- Add authentication columns to campaign_senders for client self-setup
-- This allows clients to configure their own Gmail accounts without n8n access

ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'app_password',
ADD COLUMN IF NOT EXISTS app_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS setup_instructions TEXT;

-- Create index for auth lookups
CREATE INDEX IF NOT EXISTS idx_campaign_senders_auth 
ON campaign_senders (email, auth_type, is_active);

-- Example: Set up sender with Gmail App Password (simplest for clients)
UPDATE campaign_senders 
SET auth_type = 'app_password',
    app_password = 'your-16-char-app-password',
    setup_instructions = 'Gmail → Settings → Security → 2-Step Verification → App passwords'
WHERE email = 'essabar.yassine@gmail.com';

-- Example: Set up sender with OAuth (more secure)
UPDATE campaign_senders 
SET auth_type = 'oauth',
    access_token = 'ya29.a0...',
    refresh_token = '1//04...',
    token_expires_at = NOW() + INTERVAL '1 hour'
WHERE email = 'anthoy2327@gmail.com';

-- Show current auth status
SELECT 
  email,
  name,
  is_active,
  auth_type,
  CASE 
    WHEN auth_type = 'app_password' AND app_password IS NOT NULL THEN '✅ App Password Set'
    WHEN auth_type = 'oauth' AND refresh_token IS NOT NULL THEN '✅ OAuth Configured' 
    ELSE '❌ Setup Required'
  END as auth_status,
  setup_instructions
FROM campaign_senders 
ORDER BY is_active DESC, email;

-- Client setup instructions
COMMENT ON COLUMN campaign_senders.auth_type IS 'Authentication method: app_password or oauth';
COMMENT ON COLUMN campaign_senders.app_password IS 'Gmail App Password (16 characters)';
COMMENT ON COLUMN campaign_senders.access_token IS 'OAuth access token (expires in 1 hour)';
COMMENT ON COLUMN campaign_senders.refresh_token IS 'OAuth refresh token (long-lived)';
COMMENT ON COLUMN campaign_senders.setup_instructions IS 'Client-facing setup instructions';