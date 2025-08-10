-- Fix sequence timing to make sequence 2 available immediately
-- Update the sent_at timestamp to be 10 days ago (more than the 9-day timing requirement)
UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '10 days'
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND status = 'sent';

-- Verify the update
SELECT 
  p.first_name,
  psp.status,
  s.step_number,
  s.title,
  s.timing_days,
  psp.sent_at,
  NOW() - psp.sent_at as time_since_sent
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
ORDER BY p.first_name;