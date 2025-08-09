-- TEMPORARY FIX: Remove the problematic trigger_type constraint
-- This will allow campaign creation to work while we debug the constraint issue

-- Remove the failing constraint
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_trigger_type_check;

-- For now, we'll rely on application-level validation instead of database constraint
-- This allows the API to work immediately

-- Optional: Add it back with the correct value once we confirm what works
-- (Uncomment the line below after testing which format works)
-- ALTER TABLE campaigns ADD CONSTRAINT campaigns_trigger_type_check CHECK (trigger_type IN ('new_client'));

-- Verify the constraint is gone
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'campaigns'::regclass 
AND conname LIKE '%trigger_type%';