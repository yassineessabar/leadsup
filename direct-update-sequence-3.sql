-- Direct update using the exact sequence ID from logs
-- Update sequence 3 timestamp for account rotation testing

UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '12 days',
    updated_at = NOW()
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND sequence_id = 'c5fede38-5e3e-4c2f-9f8a-02675a514531'
  AND status = 'sent';

-- Verify the update worked
SELECT 
  p.first_name,
  psp.sequence_id,
  psp.sent_at,
  NOW() - psp.sent_at as time_since_sent,
  s.step_number,
  s.timing_days
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND psp.sequence_id = 'c5fede38-5e3e-4c2f-9f8a-02675a514531'
ORDER BY p.first_name;