-- Create email_tracking table for n8n automation tracking
CREATE TABLE IF NOT EXISTS email_tracking (
    id SERIAL PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    sequence_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    message_id TEXT,
    sender_type TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_contact_id ON email_tracking(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sequence_id ON email_tracking(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow service role access (for n8n automation)
CREATE POLICY IF NOT EXISTS "Allow service role access" ON email_tracking
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Optional: Create a function to increment campaign sent count
CREATE OR REPLACE FUNCTION increment_campaign_sent_count(campaign_id_param TEXT)
RETURNS void AS $$
BEGIN
    -- This function can be implemented later if you have a campaigns table
    -- with a sent_count column to increment
    -- UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = campaign_id_param;
    NULL; -- For now, do nothing
END;
$$ LANGUAGE plpgsql;