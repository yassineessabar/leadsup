-- Clear current progress to enable sequence 2 testing
DELETE FROM prospect_sequence_progress 
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';

-- Insert sequence 1 as completed to move directly to sequence 2
INSERT INTO prospect_sequence_progress (
  id, 
  campaign_id, 
  prospect_id, 
  sequence_id, 
  status, 
  sent_at, 
  created_at, 
  updated_at
)
SELECT 
  gen_random_uuid(),
  '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4',
  p.id,
  s.id,
  'sent',
  NOW() - INTERVAL '2 days', -- Set as sent 2 days ago so sequence 2 is ready
  NOW(),
  NOW()
FROM prospects p, campaign_sequences s
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND s.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND s.step_number = 1;

-- Verify the setup
SELECT 
  p.first_name,
  p.last_name,
  psp.status,
  s.step_number,
  s.title,
  psp.sent_at
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
ORDER BY p.first_name, s.step_number;