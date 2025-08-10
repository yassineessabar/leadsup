-- Enable sequence 4 to test account rotation
-- Update the latest sequence (step 3) timestamps to make sequence 4 ready

-- Update sequence 3 timestamps to be 12 days ago (more than the 11-day timing requirement)
UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '12 days',
    updated_at = NOW()
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND status = 'sent'
  AND sequence_id IN (
    SELECT id FROM campaign_sequences 
    WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
    AND step_number = 3
  );

-- Verify sequence 4 should now be ready
SELECT 
  p.first_name,
  p.last_name,
  COUNT(*) as sequences_completed
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND psp.status = 'sent'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY p.first_name;