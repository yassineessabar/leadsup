-- Add n8n credential mapping to campaign_senders table
-- This allows dynamic credential lookup for any number of sender accounts

-- Add columns to store n8n credential information
ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS n8n_credential_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS n8n_credential_name VARCHAR(255);

-- Add index for faster credential lookups
CREATE INDEX IF NOT EXISTS idx_campaign_senders_email_active 
ON campaign_senders (email, is_active);

-- Update existing sender with known credential ID (essabar.yassine@gmail.com)
UPDATE campaign_senders 
SET n8n_credential_id = 'IOTDtRgindkH9yFZ',
    n8n_credential_name = 'Gmail essabar.yassine'
WHERE email = 'essabar.yassine@gmail.com';

-- Show current credential mapping
SELECT 
  email,
  name,
  is_active,
  n8n_credential_id,
  n8n_credential_name,
  CASE 
    WHEN n8n_credential_id IS NOT NULL THEN '✅ Has OAuth'
    ELSE '❌ Needs OAuth Setup'
  END as oauth_status
FROM campaign_senders 
ORDER BY email;

-- Instructions for adding new credentials:
-- 1. Create OAuth credential in n8n for each sender account
-- 2. Note the credential ID from n8n 
-- 3. Update this table with the credential ID:
--
-- UPDATE campaign_senders 
-- SET n8n_credential_id = 'YOUR_N8N_CREDENTIAL_ID',
--     n8n_credential_name = 'Gmail your.email@gmail.com'
-- WHERE email = 'your.email@gmail.com';