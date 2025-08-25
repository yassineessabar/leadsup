-- Add Inbound Parse configuration fields to domains table
-- This enables tracking of SendGrid Inbound Parse setup status for reply email capture

ALTER TABLE domains 
ADD COLUMN inbound_parse_configured BOOLEAN DEFAULT FALSE,
ADD COLUMN inbound_parse_hostname TEXT,
ADD COLUMN inbound_parse_webhook_id TEXT,
ADD COLUMN inbound_parse_error TEXT;

-- Add comment for documentation
COMMENT ON COLUMN domains.inbound_parse_configured IS 'Whether SendGrid Inbound Parse is configured for this domain';
COMMENT ON COLUMN domains.inbound_parse_hostname IS 'The hostname configured for inbound parse (e.g. reply.domain.com)';
COMMENT ON COLUMN domains.inbound_parse_webhook_id IS 'SendGrid webhook ID for the inbound parse configuration';
COMMENT ON COLUMN domains.inbound_parse_error IS 'Error message if inbound parse configuration failed';