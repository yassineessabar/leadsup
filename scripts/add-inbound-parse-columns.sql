-- Add inbound parse configuration columns to domains table
-- Run this migration to add proper tracking for SendGrid inbound parse settings

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS reply_subdomain text DEFAULT 'reply',
ADD COLUMN IF NOT EXISTS reply_hostname text,
ADD COLUMN IF NOT EXISTS inbound_parse_configured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS inbound_parse_webhook_id text,
ADD COLUMN IF NOT EXISTS inbound_parse_error text;

-- Create index for reply hostname lookups
CREATE INDEX IF NOT EXISTS idx_domains_reply_hostname ON domains(reply_hostname);

-- Update existing domains to extract reply hostname from description if possible
UPDATE domains 
SET 
  reply_hostname = CASE 
    WHEN description ~ 'Reply:\s*([^\s)]+)' THEN 
      substring(description from 'Reply:\s*([^\s)]+)')
    ELSE 
      reply_subdomain || '.' || domain
  END,
  inbound_parse_configured = CASE 
    WHEN description LIKE '%Inbound configured%' THEN true
    ELSE false
  END
WHERE reply_hostname IS NULL;

-- Add comment to table
COMMENT ON TABLE domains IS 'Domains table with SendGrid inbound parse configuration tracking';
COMMENT ON COLUMN domains.reply_subdomain IS 'Subdomain used for reply emails (e.g., reply)';
COMMENT ON COLUMN domains.reply_hostname IS 'Full hostname for reply emails (e.g., reply.domain.com)';
COMMENT ON COLUMN domains.inbound_parse_configured IS 'Whether SendGrid inbound parse is configured for this domain';
COMMENT ON COLUMN domains.inbound_parse_webhook_id IS 'SendGrid webhook ID for inbound parse configuration';
COMMENT ON COLUMN domains.inbound_parse_error IS 'Last error message if inbound parse configuration failed';