-- Enable sequence 6 to run immediately
-- Update sequence 5 timestamp to make sequence 6 ready now

-- First, check current sequence 5 status for essabar.yassine@gmail.com
SELECT 
  p.first_name,
  p.email_address,
  psp.sequence_id,
  psp.sent_at,
  NOW() - psp.sent_at as time_since_sent,
  s.step_number,
  s.title,
  s.timing_days,
  -- Calculate when next sequence would be due
  psp.sent_at + (s.timing_days || ' days')::INTERVAL as next_due_date
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.email_address = 'essabar.yassine@gmail.com'
  AND s.step_number = 5
  AND psp.status = 'sent'
ORDER BY psp.sent_at DESC
LIMIT 1;

-- Update sequence 5 timestamp to be 14 days ago (more than the 13-day timing requirement)
UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '14 days',
    updated_at = NOW()
WHERE prospect_id = (
  SELECT id FROM prospects WHERE email_address = 'essabar.yassine@gmail.com'
) 
AND sequence_id = (
  SELECT id FROM campaign_sequences 
  WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND step_number = 5
)
AND status = 'sent';

-- Verify the update worked - sequence 6 should now be ready
SELECT 
  p.first_name,
  p.email_address,
  COUNT(psp.*) as sequences_completed,
  MAX(s.step_number) as highest_step_completed,
  MAX(psp.sent_at) as last_sent_at,
  NOW() - MAX(psp.sent_at) as time_since_last_sent
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.email_address = 'essabar.yassine@gmail.com'
  AND psp.status = 'sent'
GROUP BY p.id, p.first_name, p.email_address;

-- Check if sequence 6 exists and what step number it should be
SELECT 
  step_number,
  title,
  subject,
  timing_days,
  is_active,
  created_at
FROM campaign_sequences
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
  AND step_number >= 6
ORDER BY step_number;

-- Final verification: Check what the API should now pick up
SELECT 
  p.first_name,
  p.email_address,
  COUNT(completed_sequences.sequence_id) as completed_count,
  COUNT(completed_sequences.sequence_id) + 1 as next_step_number
FROM prospects p
LEFT JOIN prospect_sequence_progress completed_sequences ON (
  p.id = completed_sequences.prospect_id 
  AND completed_sequences.status = 'sent'
)
WHERE p.email_address = 'essabar.yassine@gmail.com'
GROUP BY p.id, p.first_name, p.email_address;