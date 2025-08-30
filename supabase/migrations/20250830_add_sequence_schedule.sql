-- Add sequence_schedule column to store full contact sequence timing
-- This eliminates timing calculation inconsistencies between UI and automation

ALTER TABLE contacts 
ADD COLUMN sequence_schedule JSONB;

-- Add index for performance when querying schedule data
CREATE INDEX idx_contacts_sequence_schedule ON contacts USING GIN (sequence_schedule);

-- Add comment explaining the column structure
COMMENT ON COLUMN contacts.sequence_schedule IS 'Stores complete sequence schedule with timing, status, and dates for each step. Structure: {"steps": [{"step": 1, "subject": "...", "scheduled_date": "2025-08-30T09:32:00Z", "timezone": "Europe/London", "timing_days": 0, "status": "sent|pending|upcoming"}], "contact_hash": 1512415, "consistent_hour": 9, "consistent_minute": 32}';