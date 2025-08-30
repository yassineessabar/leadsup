-- Add missing columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS timezone TEXT;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS next_email_due TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_timezone ON contacts(timezone);
CREATE INDEX IF NOT EXISTS idx_contacts_next_email_due ON contacts(next_email_due);

-- Add comments
COMMENT ON COLUMN contacts.timezone IS 'Contact timezone derived from location';
COMMENT ON COLUMN contacts.next_email_due IS 'Timestamp when next email is due to be sent';