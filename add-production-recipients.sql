-- Add production recipients for email warming
-- WARNING: Only add recipients who have explicitly consented to receive warming emails

-- Example recipients (replace with your actual recipient emails)
INSERT INTO warmup_recipients (email, name, is_active, max_daily_emails, emails_received_today) 
VALUES 
  -- Add your own email addresses that you control
  ('your-email1@yourdomain.com', 'Warmup Recipient 1', true, 10, 0),
  ('your-email2@yourdomain.com', 'Warmup Recipient 2', true, 10, 0),
  ('your-email3@yourdomain.com', 'Warmup Recipient 3', true, 10, 0),
  
  -- Add team member emails (with their consent)
  ('team-member1@yourcompany.com', 'Team Member 1', true, 5, 0),
  ('team-member2@yourcompany.com', 'Team Member 2', true, 5, 0),
  
  -- Add test email accounts you own on different providers
  ('your-gmail@gmail.com', 'Gmail Test', true, 8, 0),
  ('your-outlook@outlook.com', 'Outlook Test', true, 8, 0),
  ('your-yahoo@yahoo.com', 'Yahoo Test', true, 8, 0)
ON CONFLICT (email) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  max_daily_emails = EXCLUDED.max_daily_emails;