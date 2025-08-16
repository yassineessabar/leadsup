-- Minimal SendGrid Analytics Tables
-- This creates only the essential tables with no dependencies

-- Clean up any existing tables first
DROP TABLE IF EXISTS sendgrid_events CASCADE;
DROP TABLE IF EXISTS email_tracking CASCADE;
DROP TABLE IF EXISTS campaign_metrics CASCADE;
DROP TABLE IF EXISTS user_metrics CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS update_campaign_metrics() CASCADE;
DROP FUNCTION IF EXISTS update_email_tracking() CASCADE;

-- ============================================
-- SENDGRID EVENTS TABLE (COMPLETE)
-- ============================================
CREATE TABLE sendgrid_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT,
  sg_message_id TEXT NOT NULL,
  sg_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  email TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Additional columns required by webhook
  smtp_id TEXT,
  category TEXT[],
  asm_group_id INTEGER,
  reason TEXT,
  status TEXT,
  url TEXT,
  user_agent TEXT,
  ip TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL TRACKING TABLE (MINIMAL)
-- ============================================
CREATE TABLE email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT,
  email TEXT NOT NULL,
  sg_message_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  first_opened_at TIMESTAMP WITH TIME ZONE,
  first_clicked_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CAMPAIGN METRICS TABLE (MINIMAL)
-- ============================================
CREATE TABLE campaign_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,
  spam_reports INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER METRICS TABLE (MINIMAL)
-- ============================================
CREATE TABLE user_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,
  spam_reports INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BASIC INDEXES
-- ============================================
CREATE INDEX idx_sendgrid_events_user_id ON sendgrid_events(user_id);
CREATE INDEX idx_sendgrid_events_campaign_id ON sendgrid_events(campaign_id);
CREATE INDEX idx_sendgrid_events_event_type ON sendgrid_events(event_type);
CREATE INDEX idx_sendgrid_events_timestamp ON sendgrid_events(timestamp);

CREATE INDEX idx_email_tracking_user_id ON email_tracking(user_id);
CREATE INDEX idx_email_tracking_campaign_id ON email_tracking(campaign_id);
CREATE INDEX idx_email_tracking_sg_message_id ON email_tracking(sg_message_id);

CREATE INDEX idx_campaign_metrics_user_id ON campaign_metrics(user_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);

CREATE INDEX idx_user_metrics_user_id ON user_metrics(user_id);
CREATE INDEX idx_user_metrics_date ON user_metrics(date);

-- ============================================
-- BASIC RLS POLICIES
-- ============================================
ALTER TABLE sendgrid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_sendgrid_events" ON sendgrid_events FOR ALL USING (true);
CREATE POLICY "allow_all_email_tracking" ON email_tracking FOR ALL USING (true);
CREATE POLICY "allow_all_campaign_metrics" ON campaign_metrics FOR ALL USING (true);
CREATE POLICY "allow_all_user_metrics" ON user_metrics FOR ALL USING (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Minimal SendGrid tables created successfully!' as status;