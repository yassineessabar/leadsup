-- Create SendGrid tracking tables for real health score calculation
-- Run this in Supabase SQL editor or via migration

-- ============================================
-- SENDGRID EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sendgrid_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT,
  sg_message_id TEXT NOT NULL,
  sg_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'processed', 'delivered', 'deferred', 'bounce', 'blocked',
    'open', 'click', 'unsubscribe', 'group_unsubscribe', 'spam_report'
  )),
  email TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_data JSONB DEFAULT '{}',
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
-- SENDER METRICS TABLE (DAILY AGGREGATIONS)
-- ============================================

CREATE TABLE IF NOT EXISTS sender_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Core metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  emails_deferred INTEGER DEFAULT 0,
  
  -- Engagement metrics
  unique_opens INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  
  -- Negative metrics
  unsubscribes INTEGER DEFAULT 0,
  spam_reports INTEGER DEFAULT 0,
  
  -- Calculated rates
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metrics per sender per date
  UNIQUE(user_id, sender_email, date)
);

-- ============================================
-- INDEXES
-- ============================================

-- SendGrid events indexes
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_user_id ON sendgrid_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_email ON sendgrid_events(email);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_timestamp ON sendgrid_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_event_type ON sendgrid_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_sender_email ON sendgrid_events((event_data->>'sender_email'));

-- Sender metrics indexes  
CREATE INDEX IF NOT EXISTS idx_sender_metrics_user_id ON sender_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_sender_email ON sender_metrics(sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_date ON sender_metrics(date);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE sendgrid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sender_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all data
CREATE POLICY "Service role can manage sendgrid_events" ON sendgrid_events
  FOR ALL USING (true);

CREATE POLICY "Service role can manage sender_metrics" ON sender_metrics
  FOR ALL USING (true);

-- ============================================
-- SUCCESS
-- ============================================

SELECT 'SendGrid tracking tables created successfully! 🎉' as result;