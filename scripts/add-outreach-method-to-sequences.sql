-- Add outreach_method column to campaign_sequences table
-- This allows each sequence step to specify whether it's for email, LinkedIn, or phone outreach

ALTER TABLE campaign_sequences 
ADD COLUMN IF NOT EXISTS outreach_method TEXT DEFAULT 'email' 
CHECK (outreach_method IN ('email', 'linkedin', 'phone'));

-- Update existing sequences to use email as the default method
UPDATE campaign_sequences 
SET outreach_method = 'email' 
WHERE outreach_method IS NULL;

-- Create index for faster filtering by outreach method
CREATE INDEX IF NOT EXISTS idx_campaign_sequences_outreach_method 
ON campaign_sequences(outreach_method);