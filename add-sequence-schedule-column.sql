-- Add sequence_schedule column to store full contact sequence timing
ALTER TABLE contacts 
ADD COLUMN sequence_schedule JSONB;

-- Add index for performance when querying schedule data
CREATE INDEX idx_contacts_sequence_schedule ON contacts USING GIN (sequence_schedule);

-- Add comment explaining the column
COMMENT ON COLUMN contacts.sequence_schedule IS 'Stores complete sequence schedule with timing, status, and dates for each step';