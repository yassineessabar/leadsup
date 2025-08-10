-- Quick fix: Make sequence 6 available immediately
-- This updates sequence 5 timestamp to be 14 days ago

UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '14 days',
    updated_at = NOW()
WHERE prospect_id = (
  SELECT id FROM prospects WHERE email_address = 'essabar.yassine@gmail.com'
) 
AND sequence_id IN (
  SELECT id FROM campaign_sequences 
  WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND step_number = 5
)
AND status = 'sent';

-- Verify the update
SELECT 
  'Updated sequence 5 timestamp - sequence 6 should now be ready!' as status;

-- Check what sequences are completed now
SELECT 
  p.first_name,
  p.email_address,
  COUNT(psp.*) as completed_sequences,
  MAX(s.step_number) as highest_completed_step
FROM prospects p
JOIN prospect_sequence_progress psp ON p.id = psp.prospect_id
JOIN campaign_sequences s ON psp.sequence_id = s.id
WHERE p.email_address = 'essabar.yassine@gmail.com'
  AND psp.status = 'sent'
GROUP BY p.id, p.first_name, p.email_address;