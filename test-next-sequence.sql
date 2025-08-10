-- Simulate that Step 1 was sent 25 hours ago (past the 1-day timing_days requirement)
UPDATE prospect_sequence_progress 
SET sent_at = NOW() - INTERVAL '25 hours'
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' 
  AND status = 'sent';