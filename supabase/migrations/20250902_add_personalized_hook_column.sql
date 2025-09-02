-- Add personalized_hook column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS personalized_hook TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_personalized_hook ON contacts(personalized_hook);

-- Add comment for documentation
COMMENT ON COLUMN contacts.personalized_hook IS 'AI-generated personalized hook for outreach';