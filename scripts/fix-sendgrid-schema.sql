-- Fix SendGrid Events table schema
-- Add missing columns that the webhook code expects

-- Add missing columns to sendgrid_events table
ALTER TABLE sendgrid_events 
ADD COLUMN IF NOT EXISTS asm_group_id INTEGER,
ADD COLUMN IF NOT EXISTS smtp_id TEXT,
ADD COLUMN IF NOT EXISTS category TEXT[],
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS ip TEXT;

-- Add unique constraint for email tracking table if it doesn't exist
-- This is needed for the triggers to work properly
ALTER TABLE email_tracking 
ADD CONSTRAINT IF NOT EXISTS unique_msg_email UNIQUE (sg_message_id, email);

-- Add unique constraint for campaign metrics to handle conflicts
ALTER TABLE campaign_metrics 
ADD CONSTRAINT IF NOT EXISTS unique_campaign_date UNIQUE (user_id, campaign_id, date);

-- Add unique constraint for user metrics to handle conflicts  
ALTER TABLE user_metrics
ADD CONSTRAINT IF NOT EXISTS unique_user_date UNIQUE (user_id, date);

SELECT 'SendGrid schema fixes applied successfully!' as status;