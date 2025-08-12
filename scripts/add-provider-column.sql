-- Add provider column to domains table
-- This should be run in the Supabase SQL editor

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN domains.provider IS 'DNS provider name (e.g., GoDaddy, Namecheap, Cloudflare, etc.)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'domains' 
AND column_name = 'provider';