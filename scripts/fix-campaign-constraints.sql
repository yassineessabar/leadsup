-- Fix campaign constraints to match frontend values
-- This script ensures the trigger_type constraint allows "New Client"

-- First, let's see what the current constraint allows
-- You can run this to check: SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%trigger_type%';

-- Drop the existing constraint if it exists
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_trigger_type_check;

-- Add the correct constraint that allows "New Client"
ALTER TABLE campaigns ADD CONSTRAINT campaigns_trigger_type_check 
CHECK (trigger_type IN ('New Client'));

-- Also ensure the type constraint is correct
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_type_check 
CHECK (type IN ('Email', 'SMS'));

-- And ensure status constraint is correct
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('Draft', 'Active', 'Paused', 'Completed'));

-- Add some helpful comments
COMMENT ON COLUMN campaigns.trigger_type IS 'Campaign trigger type: currently only supports "New Client"';
COMMENT ON COLUMN campaigns.type IS 'Campaign type: Email or SMS';
COMMENT ON COLUMN campaigns.status IS 'Campaign status: Draft, Active, Paused, or Completed';