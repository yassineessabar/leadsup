-- Add sequence_step column to contacts table for automation status tracking

ALTER TABLE contacts 
ADD COLUMN sequence_step integer DEFAULT 0;

-- Add index for better query performance
CREATE INDEX idx_contacts_sequence_step ON contacts(sequence_step);

-- Add last_contacted_at column for better tracking
ALTER TABLE contacts 
ADD COLUMN last_contacted_at timestamptz;

-- Add index for last_contacted_at
CREATE INDEX idx_contacts_last_contacted_at ON contacts(last_contacted_at);