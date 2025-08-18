-- DIY Email Warming Recipients Setup
-- Cost: $0/month vs $207/month for Mailwarm!

-- Clear existing test recipients and add real ones
DELETE FROM warmup_recipients WHERE email LIKE '%@mailwarm.co' OR email LIKE '%@warmupflow.com';

-- Add your own email accounts (create these if you don't have them)
INSERT INTO warmup_recipients (email, name, is_active, max_daily_emails, emails_received_today) VALUES
-- Your own email addresses on different providers
('your-name+warmup1@gmail.com', 'Gmail Warmup 1', true, 8, 0),
('your-name+warmup2@gmail.com', 'Gmail Warmup 2', true, 8, 0),
('your-name+warmup1@outlook.com', 'Outlook Warmup 1', true, 8, 0),
('your-name+warmup2@outlook.com', 'Outlook Warmup 2', true, 8, 0),
('your-name+warmup1@yahoo.com', 'Yahoo Warmup 1', true, 6, 0),
('your-name+warmup2@yahoo.com', 'Yahoo Warmup 2', true, 6, 0),

-- Team members (with their permission)
('team-member1@yourcompany.com', 'Team Member 1', true, 5, 0),
('team-member2@yourcompany.com', 'Team Member 2', true, 5, 0),

-- Business email accounts you create specifically for warming
('support+warmup@leadsup.io', 'Support Warmup', true, 10, 0),
('sales+warmup@leadsup.io', 'Sales Warmup', true, 10, 0),
('marketing+warmup@leadsup.io', 'Marketing Warmup', true, 10, 0),

-- Free email accounts you can create for warming
('leadsup.warmup1@protonmail.com', 'ProtonMail Warmup', true, 5, 0),
('leadsup.warmup2@tutanota.com', 'Tutanota Warmup', true, 5, 0)

ON CONFLICT (email) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  max_daily_emails = EXCLUDED.max_daily_emails,
  emails_received_today = 0;

-- Update settings for better warming
UPDATE warmup_recipients SET 
  last_reset_at = NOW(),
  emails_received_today = 0
WHERE is_active = true;