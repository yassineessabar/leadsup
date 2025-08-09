-- Debug script to check current campaign table constraints
-- Run these queries in your database to see what's expected

-- 1. Check the current trigger_type constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'campaigns'::regclass 
AND conname LIKE '%trigger_type%';

-- 2. Check all constraints on campaigns table
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'campaigns'::regclass;

-- 3. Check the table structure
\d campaigns;

-- 4. See what values are currently allowed (if any exist)
SELECT DISTINCT trigger_type FROM campaigns;

-- 5. Try to insert a test row to see the exact error
-- INSERT INTO campaigns (user_id, name, type, trigger_type, status) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'test', 'Email', 'New Client', 'Draft');