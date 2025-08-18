-- DIY Warming Recipients Setup
-- Replace the example emails below with your actual email addresses

-- Clear existing test recipients
DELETE FROM warmup_recipients;

-- Add your DIY warming recipients
-- IMPORTANT: Replace these with your ACTUAL email addresses!

INSERT INTO warmup_recipients (email, name, is_active, max_daily_emails, emails_received_today) VALUES
-- Gmail accounts (create these first!)
('REPLACE-WITH-YOUR-EMAIL+warmup1@gmail.com', 'Gmail Warmup 1', true, 8, 0),
('REPLACE-WITH-YOUR-EMAIL+warmup2@gmail.com', 'Gmail Warmup 2', true, 8, 0),
('REPLACE-WITH-YOUR-EMAIL+warmup3@gmail.com', 'Gmail Warmup 3', true, 8, 0),

-- Outlook accounts (create these!)
('REPLACE-WITH-YOUR-NAME.warmup1@outlook.com', 'Outlook Warmup 1', true, 8, 0),
('REPLACE-WITH-YOUR-NAME.warmup2@outlook.com', 'Outlook Warmup 2', true, 8, 0),

-- Yahoo accounts (create these!)
('REPLACE-WITH-YOUR-NAME.warmup1@yahoo.com', 'Yahoo Warmup 1', true, 6, 0),
('REPLACE-WITH-YOUR-NAME.warmup2@yahoo.com', 'Yahoo Warmup 2', true, 6, 0),

-- Other providers (create these!)
('REPLACE-WITH-YOUR-NAME.warmup@protonmail.com', 'ProtonMail Warmup', true, 5, 0),
('REPLACE-WITH-YOUR-NAME.warmup@tutanota.com', 'Tutanota Warmup', true, 5, 0),

-- Your business domain (if you have additional emails)
('warmup1@leadsup.io', 'LeadsUp Warmup 1', true, 10, 0),
('warmup2@leadsup.io', 'LeadsUp Warmup 2', true, 10, 0)

ON CONFLICT (email) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  max_daily_emails = EXCLUDED.max_daily_emails,
  emails_received_today = 0;

-- Verify the recipients were added
SELECT email, name, is_active, max_daily_emails FROM warmup_recipients ORDER BY email;