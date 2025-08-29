-- Add real recipients for warmup automation
-- These are real email addresses that can receive warmup emails

INSERT INTO warmup_recipients (email, name, domain, is_active, max_daily_emails, emails_received_today) 
VALUES 
  ('essabar.yassine@gmail.com', 'Yassine Essabar', 'gmail.com', true, 20, 0),
  ('anthoy2327@gmail.com', 'Anthony', 'gmail.com', true, 15, 0),
  -- Add some backup recipients for better warmup diversity
  ('yassineessabar+warmup1@gmail.com', 'Warmup Test 1', 'gmail.com', true, 10, 0),
  ('yassineessabar+warmup2@gmail.com', 'Warmup Test 2', 'gmail.com', true, 10, 0),
  ('yassineessabar+warmup3@gmail.com', 'Warmup Test 3', 'gmail.com', true, 10, 0)
ON CONFLICT (email) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  max_daily_emails = EXCLUDED.max_daily_emails,
  updated_at = NOW();

-- Verify the recipients were added
SELECT email, name, is_active, max_daily_emails FROM warmup_recipients ORDER BY email;