-- Reset Sequence Progress for Testing
-- Use this when you edit sequences and want to test them fresh

-- Clear all progress for your campaign
DELETE FROM prospect_sequence_progress 
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';

-- Verify it's cleared
SELECT COUNT(*) as remaining_records
FROM prospect_sequence_progress 
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';