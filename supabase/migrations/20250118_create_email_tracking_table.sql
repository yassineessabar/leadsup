-- Create email_tracking table for sequence email tracking
CREATE TABLE IF NOT EXISTS email_tracking (
    id BIGSERIAL PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    sequence_id TEXT NOT NULL,
    sequence_step INTEGER,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked', 'replied')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_id TEXT,
    sender_type TEXT DEFAULT 'sendgrid' CHECK (sender_type IN ('sendgrid', 'simulation', 'smtp')),
    sender_email TEXT,
    recipient_email TEXT,
    subject TEXT,
    error_message TEXT,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_contact_id ON email_tracking(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sequence_id ON email_tracking(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_tracking_message_id ON email_tracking(message_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient_email ON email_tracking(recipient_email);

-- Create foreign key relationships if the tables exist
-- Note: These will only work if campaigns and contacts tables exist with proper structure
DO $$
BEGIN
    -- Try to add foreign key to campaigns table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        BEGIN
            ALTER TABLE email_tracking 
            ADD CONSTRAINT fk_email_tracking_campaign 
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if foreign key constraint fails
            NULL;
        END;
    END IF;
    
    -- Try to add foreign key to contacts table  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        BEGIN
            ALTER TABLE email_tracking 
            ADD CONSTRAINT fk_email_tracking_contact 
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if foreign key constraint fails
            NULL;
        END;
    END IF;
END $$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_tracking_updated_at
    BEFORE UPDATE ON email_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_email_tracking_updated_at();

-- Add comment to document the table purpose
COMMENT ON TABLE email_tracking IS 'Tracks sequence email sending, delivery, and engagement metrics';
COMMENT ON COLUMN email_tracking.campaign_id IS 'ID of the campaign this email belongs to';
COMMENT ON COLUMN email_tracking.contact_id IS 'ID of the contact who received this email';
COMMENT ON COLUMN email_tracking.sequence_id IS 'ID of the sequence step this email represents';
COMMENT ON COLUMN email_tracking.sequence_step IS 'Step number in the sequence (1, 2, 3, etc.)';
COMMENT ON COLUMN email_tracking.status IS 'Current status of the email (sent, delivered, opened, etc.)';
COMMENT ON COLUMN email_tracking.sender_type IS 'Method used to send the email (sendgrid, simulation, smtp)';
COMMENT ON COLUMN email_tracking.message_id IS 'Unique message ID from the email service provider';