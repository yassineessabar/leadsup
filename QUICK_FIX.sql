-- QUICK FIX: Add missing SendGrid columns
-- Copy and paste this DIRECTLY into Supabase SQL Editor

-- Add bounces column
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS bounces INTEGER DEFAULT 0;

-- Add blocks column  
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS blocks INTEGER DEFAULT 0;

-- Add total_opens column
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS total_opens INTEGER DEFAULT 0;

-- Add total_clicks column
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0;

-- Add spam_reports column
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS spam_reports INTEGER DEFAULT 0;

-- Add bounce_rate column
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,2) DEFAULT 0;

-- Also update user_metrics table
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS bounces INTEGER DEFAULT 0;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS blocks INTEGER DEFAULT 0;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS total_opens INTEGER DEFAULT 0;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS spam_reports INTEGER DEFAULT 0;
ALTER TABLE user_metrics ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,2) DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaign_metrics' 
AND column_name IN ('bounces', 'blocks', 'total_opens', 'total_clicks', 'spam_reports', 'bounce_rate')
ORDER BY column_name;