-- Check current production schema before running automation setup

-- Check what tables exist
SELECT 'Current tables:' as info, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check prospects table structure (key for automation)
SELECT 'prospects columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'prospects'
ORDER BY ordinal_position;

-- Check campaigns table structure
SELECT 'campaigns columns:' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;

-- Check if campaign_sequences exists
SELECT 'campaign_sequences exists:' as info, 
       CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'campaign_sequences') 
            THEN 'Yes' ELSE 'No' END as exists;

-- Check if campaign_senders exists  
SELECT 'campaign_senders exists:' as info,
       CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'campaign_senders')
            THEN 'Yes' ELSE 'No' END as exists;

-- Check existing constraints that might conflict
SELECT 'constraints:' as info, conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid IN ('campaigns'::regclass, 'prospects'::regclass)
ORDER BY conname;