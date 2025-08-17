-- Add automation-related columns to contacts table
-- These columns are needed for email sequence tracking

DO $$ 
BEGIN
    -- Add tags column if it doesn't exist (for contact categorization)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- Add timezone column for time-based sending
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
    END IF;

    -- Add sequence tracking columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'current_sequence_step'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN current_sequence_step INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'last_contacted_at'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN last_contacted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'next_sequence_at'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN next_sequence_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add engagement tracking columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'email_sent_count'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN email_sent_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'email_opened_count'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN email_opened_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'email_clicked_count'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN email_clicked_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'email_replied_count'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN email_replied_count INTEGER DEFAULT 0;
    END IF;

    -- Add is_active flag for contact management
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add unsubscribed flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'is_unsubscribed'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN is_unsubscribed BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add bounce tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'is_bounced'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN is_bounced BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add notes column for additional context
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE contacts 
        ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_campaign_sequence ON contacts(campaign_id, current_sequence_step);
CREATE INDEX IF NOT EXISTS idx_contacts_next_sequence ON contacts(next_sequence_at);
CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(is_active, is_unsubscribed, is_bounced);
CREATE INDEX IF NOT EXISTS idx_contacts_timezone ON contacts(timezone);

-- Add comment for documentation
COMMENT ON COLUMN contacts.tags IS 'Array of tags for contact categorization (e.g., new, in_sequence, completed)';
COMMENT ON COLUMN contacts.timezone IS 'Contact timezone for time-based email sending';
COMMENT ON COLUMN contacts.current_sequence_step IS 'Current position in email sequence (0 = not started)';
COMMENT ON COLUMN contacts.last_contacted_at IS 'Timestamp of last email sent to this contact';
COMMENT ON COLUMN contacts.next_sequence_at IS 'Scheduled time for next sequence email';
COMMENT ON COLUMN contacts.is_active IS 'Whether contact is active for campaigns';
COMMENT ON COLUMN contacts.is_unsubscribed IS 'Whether contact has unsubscribed';
COMMENT ON COLUMN contacts.is_bounced IS 'Whether email has hard bounced';

SELECT 'Automation columns added to contacts table successfully! 🎉' as status;