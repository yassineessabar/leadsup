-- Option: Reduce timing_days for faster testing
-- This makes sequences send every 1 minute instead of 9 days
UPDATE campaign_sequences 
SET timing_days = 0.0007  -- About 1 minute (1/1440 of a day)
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';

-- Verify the update
SELECT 
  step_number,
  title,
  timing_days,
  timing_days * 24 * 60 as timing_minutes
FROM campaign_sequences
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
ORDER BY step_number;