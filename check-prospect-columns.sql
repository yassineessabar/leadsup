-- Check what columns actually exist in prospects table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prospects'
ORDER BY ordinal_position;

-- Also check a sample record to see the data
SELECT * FROM prospects LIMIT 1;