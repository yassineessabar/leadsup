-- Drop the gmail_accounts table since we're now using campaign_senders
-- Run this ONLY AFTER confirming that campaign_senders is working correctly

-- First, let's see if there are any references to gmail_accounts table
-- (This is just for information - you may see some dependencies)

-- Show existing gmail_accounts (for backup purposes if needed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gmail_accounts') THEN
        RAISE NOTICE 'gmail_accounts table exists. Records count:';
        PERFORM * FROM gmail_accounts;
    ELSE
        RAISE NOTICE 'gmail_accounts table does not exist';
    END IF;
END $$;

-- Drop the table (this will also drop all related policies, indexes, etc.)
DROP TABLE IF EXISTS gmail_accounts CASCADE;

-- Verify the table has been dropped
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'gmail_accounts';

-- Show that campaign_senders is working
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'campaign_senders' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT 'Gmail accounts table dropped successfully! All Gmail data now lives in campaign_senders. 🎉' as status;