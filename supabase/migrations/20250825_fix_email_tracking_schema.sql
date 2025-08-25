-- Alter email_tracking table to support proper tracking
-- Add columns for tracking pixel and click tracking

-- Add tracking ID column that can store string IDs
ALTER TABLE email_tracking 
ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE;

-- Add user_id column for user-level tracking
ALTER TABLE email_tracking
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add open/click tracking columns
ALTER TABLE email_tracking
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMP WITH TIME ZONE,  
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sg_message_id TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS category JSONB;

-- Create index on tracking_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_tracking_tracking_id ON email_tracking(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_user_id ON email_tracking(user_id);

-- Allow inserting with string tracking_id as primary identifier
-- Create a new table that properly supports tracking
CREATE TABLE IF NOT EXISTS email_tracking_v2 (
    id TEXT PRIMARY KEY, -- Use text ID for tracking IDs like track_xxxx
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    contact_id TEXT,
    sequence_id TEXT,
    sequence_step INTEGER,
    email TEXT NOT NULL,
    sg_message_id TEXT,
    subject TEXT,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_opened_at TIMESTAMP WITH TIME ZONE,
    open_count INTEGER DEFAULT 0,
    first_clicked_at TIMESTAMP WITH TIME ZONE,
    click_count INTEGER DEFAULT 0,
    delivered_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    category JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_email_tracking_v2_user_id ON email_tracking_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_v2_campaign_id ON email_tracking_v2(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_v2_email ON email_tracking_v2(email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_v2_sent_at ON email_tracking_v2(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_tracking_v2_sg_message_id ON email_tracking_v2(sg_message_id);

-- Migrate existing data if any (optional)
INSERT INTO email_tracking_v2 (
    id,
    user_id, 
    campaign_id,
    contact_id,
    sequence_id,
    sequence_step,
    email,
    sg_message_id,
    subject,
    status,
    sent_at,
    first_opened_at,
    open_count,
    first_clicked_at,
    click_count,
    delivered_at,
    bounced_at,
    replied_at,
    created_at,
    updated_at
)
SELECT 
    COALESCE(tracking_id, 'legacy_' || id::text) as id,
    COALESCE(user_id, 'unknown') as user_id,
    campaign_id,
    contact_id,
    sequence_id,
    sequence_step,
    COALESCE(email, recipient_email, 'unknown@example.com') as email,
    COALESCE(sg_message_id, message_id) as sg_message_id,
    subject,
    status,
    sent_at,
    COALESCE(first_opened_at, opened_at) as first_opened_at,
    open_count,
    COALESCE(first_clicked_at, clicked_at) as first_clicked_at,
    click_count,
    delivered_at,
    bounced_at,
    replied_at,
    created_at,
    updated_at
FROM email_tracking
WHERE tracking_id IS NOT NULL OR user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Rename tables to switch to the new schema
ALTER TABLE email_tracking RENAME TO email_tracking_old;
ALTER TABLE email_tracking_v2 RENAME TO email_tracking;

-- Add comment to document the new table
COMMENT ON TABLE email_tracking IS 'Tracks email sending, delivery, and engagement metrics with string-based tracking IDs';
COMMENT ON COLUMN email_tracking.id IS 'Unique tracking ID (e.g., track_xxxx)';
COMMENT ON COLUMN email_tracking.first_opened_at IS 'Timestamp of first email open';
COMMENT ON COLUMN email_tracking.open_count IS 'Total number of times email was opened';
COMMENT ON COLUMN email_tracking.first_clicked_at IS 'Timestamp of first link click';
COMMENT ON COLUMN email_tracking.click_count IS 'Total number of link clicks';