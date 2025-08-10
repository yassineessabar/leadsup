-- Check what sequences exist in your campaign
SELECT 
  step_number,
  title,
  subject,
  is_active,
  timing_days
FROM campaign_sequences
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
ORDER BY step_number;

-- Count total sequences
SELECT COUNT(*) as total_sequences
FROM campaign_sequences
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND is_active = true;