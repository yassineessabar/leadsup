-- FINAL FIX: Add missing column to email_tracking table

-- Add bounce_reason column to email_tracking
ALTER TABLE email_tracking ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_tracking' 
AND column_name = 'bounce_reason';