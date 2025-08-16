-- Fix email tracking table for proper upserts

-- First add the missing column if needed
ALTER TABLE email_tracking ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Add unique constraint for sg_message_id (needed for ON CONFLICT)
-- First check if constraint already exists, then add if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'email_tracking' 
        AND constraint_name = 'email_tracking_sg_message_id_unique'
    ) THEN
        ALTER TABLE email_tracking ADD CONSTRAINT email_tracking_sg_message_id_unique 
        UNIQUE (sg_message_id);
    END IF;
END $$;

-- Verify the constraint was added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'email_tracking' 
AND constraint_type = 'UNIQUE';