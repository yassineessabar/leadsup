-- Enable sequence 3 by updating sequence 2 sent timestamp
-- This makes it appear sequence 2 was sent long enough ago to trigger sequence 3

-- First, check current status
SELECT 
  p.first_name,
  s.step_number,
  s.title,
  s.timing_days,
  psp.status,
  psp.sent_at,
  NOW() - psp.sent_at as time_since_sent
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
ORDER BY p.first_name, s.step_number;

-- Update the most recent sequence 2 records to be sent 10 days ago
UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '10 days',
    updated_at = NOW()
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND status = 'sent'
  AND sequence_id IN (
    SELECT id FROM campaign_sequences 
    WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
    AND step_number = 2
  );

-- Verify sequence 3 should now be ready
SELECT 
  p.first_name,
  COUNT(*) as sequences_completed
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND psp.status = 'sent'
GROUP BY p.id, p.first_name
ORDER BY p.first_name;