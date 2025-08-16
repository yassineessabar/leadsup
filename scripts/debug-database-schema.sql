-- Debug script to see what tables and columns exist
-- Run this first to understand your database structure

-- Check all tables in public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check all columns in existing tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN ('users', 'campaigns', 'contacts')
ORDER BY table_name, ordinal_position;

-- Check if any SendGrid tables already exist
SELECT 
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE '%sendgrid%' OR table_name LIKE '%email_tracking%';

-- Check for any existing foreign key constraints
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public';