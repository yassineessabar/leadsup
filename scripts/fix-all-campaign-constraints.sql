-- Comprehensive fix for campaign constraints
-- This handles multiple possible constraint variations

-- First, drop all existing constraints to start fresh
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_trigger_type_check;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Option 1: Try with lowercase underscore format (most common in databases)
ALTER TABLE campaigns ADD CONSTRAINT campaigns_trigger_type_check 
CHECK (trigger_type IN ('new_client'));

-- Alternatively, if you prefer the original format, use this instead:
-- ALTER TABLE campaigns ADD CONSTRAINT campaigns_trigger_type_check 
-- CHECK (trigger_type IN ('New Client'));

-- Fix type constraint
ALTER TABLE campaigns ADD CONSTRAINT campaigns_type_check 
CHECK (type IN ('Email', 'SMS'));

-- Fix status constraint  
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('Draft', 'Active', 'Paused', 'Completed'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);

-- Verify the constraints are in place
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'campaigns'::regclass
AND contype = 'c';  -- 'c' for check constraints