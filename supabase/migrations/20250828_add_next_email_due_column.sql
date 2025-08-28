-- Add next_email_due column to contacts table for email timing tracking

ALTER TABLE contacts 
ADD COLUMN next_email_due timestamptz;

-- Add index for better query performance on timing queries
CREATE INDEX idx_contacts_next_email_due ON contacts(next_email_due);

-- Add comment explaining the column
COMMENT ON COLUMN contacts.next_email_due IS 'Timestamp when the next email in the sequence is due to be sent';