-- Enable sequence 5 to test round-robin sender rotation
-- Update sequence 4 timestamps to make sequence 5 ready immediately

-- First, check current sequence 4 status
SELECT 
  p.first_name,
  psp.sequence_id,
  psp.sent_at,
  NOW() - psp.sent_at as time_since_sent,
  s.step_number,
  s.title,
  s.timing_days
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND s.step_number = 4
ORDER BY p.first_name;

-- Update sequence 4 timestamps to be 13 days ago (more than any timing requirement)
UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '13 days',
    updated_at = NOW()
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND sequence_id = '330e4806-e36a-4320-ac0d-6a187dd0b12a'  -- Step 4 sequence ID from logs
  AND status = 'sent';

-- Verify sequence 5 should now be ready
SELECT 
  p.first_name,
  COUNT(*) as sequences_completed,
  MAX(s.step_number) as highest_step_completed
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND psp.status = 'sent'
GROUP BY p.id, p.first_name
ORDER BY p.first_name;

-- Check if sequence 5 exists
SELECT 
  step_number,
  title,
  subject,
  timing_days,
  is_active
FROM campaign_sequences
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND step_number = 5;