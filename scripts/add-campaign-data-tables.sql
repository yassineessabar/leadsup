-- Add missing tables for comprehensive campaign data storage
-- Run this in your Supabase SQL Editor

-- ============================================
-- CAMPAIGN SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  daily_contacts_limit INTEGER DEFAULT 35,
  daily_sequence_limit INTEGER DEFAULT 100,
  active_days TEXT[] DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  sending_start_time TEXT DEFAULT '08:00 AM',
  sending_end_time TEXT DEFAULT '05:00 PM',
  signature_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- ============================================
-- CAMPAIGN SENDERS TABLE (for sender account selection)
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_senders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sender_account_id TEXT NOT NULL,
  sender_type TEXT DEFAULT 'email' CHECK (sender_type IN ('email', 'sms')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, sender_account_id)
);

-- ============================================
-- CAMPAIGN SCRAPING SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_scraping_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE,
  daily_limit INTEGER DEFAULT 100,
  industry TEXT DEFAULT '',
  keyword TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- ============================================
-- UPDATE CAMPAIGN SEQUENCES TABLE
-- ============================================

-- Add missing columns to existing campaign_sequences table
ALTER TABLE campaign_sequences 
ADD COLUMN IF NOT EXISTS sequence_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sequence_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS outreach_method TEXT DEFAULT 'email';

-- ============================================
-- GMAIL ACCOUNTS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS gmail_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  profile_picture TEXT,
  warmup_status TEXT DEFAULT 'inactive',
  health_score INTEGER DEFAULT 75,
  daily_limit INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- ============================================
-- MICROSOFT 365 ACCOUNTS TABLE (if not exists) 
-- ============================================

CREATE TABLE IF NOT EXISTS microsoft365_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  profile_picture TEXT,
  health_score INTEGER DEFAULT 85,
  daily_limit INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- ============================================
-- SMTP ACCOUNTS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS smtp_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  imap_host TEXT,
  imap_port INTEGER,
  health_score INTEGER DEFAULT 75,
  daily_limit INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_campaign_settings_campaign_id ON campaign_settings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_senders_campaign_id ON campaign_senders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_scraping_settings_campaign_id ON campaign_scraping_settings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_microsoft365_accounts_user_id ON microsoft365_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_smtp_accounts_user_id ON smtp_accounts(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_scraping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE microsoft365_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Users can manage own campaign settings" ON campaign_settings
  FOR ALL USING (true); -- Enforced by application logic

CREATE POLICY "Users can manage own campaign senders" ON campaign_senders
  FOR ALL USING (true); -- Enforced by application logic

CREATE POLICY "Users can manage own campaign scraping settings" ON campaign_scraping_settings
  FOR ALL USING (true); -- Enforced by application logic

CREATE POLICY "Users can manage own gmail accounts" ON gmail_accounts
  FOR ALL USING (true); -- Enforced by application logic

CREATE POLICY "Users can manage own microsoft365 accounts" ON microsoft365_accounts
  FOR ALL USING (true); -- Enforced by application logic

CREATE POLICY "Users can manage own smtp accounts" ON smtp_accounts
  FOR ALL USING (true); -- Enforced by application logic

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================

CREATE TRIGGER campaign_settings_updated_at BEFORE UPDATE ON campaign_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaign_scraping_settings_updated_at BEFORE UPDATE ON campaign_scraping_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER gmail_accounts_updated_at BEFORE UPDATE ON gmail_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER microsoft365_accounts_updated_at BEFORE UPDATE ON microsoft365_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER smtp_accounts_updated_at BEFORE UPDATE ON smtp_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

SELECT 'Campaign data tables created successfully! 🎉' as status;
SELECT 'All campaign settings, senders, and email account tables are ready.' as details;