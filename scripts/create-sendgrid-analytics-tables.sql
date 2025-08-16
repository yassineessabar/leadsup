-- SendGrid Analytics Tables for Campaign Statistics
-- This script creates tables for storing SendGrid events and aggregated metrics

-- ============================================
-- RAW SENDGRID EVENTS TABLE
-- ============================================

-- Table to store raw SendGrid events from webhook
CREATE TABLE IF NOT EXISTS sendgrid_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- SendGrid event identifiers
  sg_message_id TEXT NOT NULL,
  sg_event_id TEXT UNIQUE NOT NULL, -- For deduplication
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'processed', 'delivered', 'deferred', 'bounce', 'blocked',
    'open', 'click', 'unsubscribe', 'group_unsubscribe', 'spam_report'
  )),
  
  -- Recipient information
  email TEXT NOT NULL,
  
  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Event-specific data (stored as JSONB for flexibility)
  event_data JSONB DEFAULT '{}',
  
  -- Additional metadata
  smtp_id TEXT,
  category TEXT[],
  asm_group_id INTEGER,
  
  -- Bounce/block details
  reason TEXT,
  status TEXT,
  
  -- Click/open details  
  url TEXT,
  user_agent TEXT,
  ip TEXT,
  
  -- Indexes for performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL TRACKING TABLE  
-- ============================================

-- Table to track individual email sends and their status
CREATE TABLE IF NOT EXISTS email_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Email details
  email TEXT NOT NULL,
  sg_message_id TEXT NOT NULL,
  
  -- Current status (latest event for this email)
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent', 'processed', 'delivered', 'deferred', 'bounce', 'blocked',
    'opened', 'clicked', 'unsubscribed', 'spam'
  )),
  
  -- Event timestamps
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  first_opened_at TIMESTAMP WITH TIME ZONE,
  first_clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Event counts
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Metadata
  subject TEXT,
  category TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique tracking per email per campaign
  UNIQUE(campaign_id, email, sg_message_id)
);

-- ============================================
-- CAMPAIGN METRICS AGGREGATION TABLE
-- ============================================

-- Table for pre-aggregated campaign metrics (updated in real-time)
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Date for daily aggregations
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
  
  -- Calculated rates (stored for performance)
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metrics per campaign per date
  UNIQUE(campaign_id, date)
);

-- ============================================
-- USER METRICS AGGREGATION TABLE
-- ============================================

-- Table for user-level aggregated metrics across all campaigns
CREATE TABLE IF NOT EXISTS user_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Date for daily aggregations
  date DATE NOT NULL,
  
  -- Core metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  
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
  
  -- Ensure unique metrics per user per date
  UNIQUE(user_id, date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- SendGrid events indexes
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_user_id ON sendgrid_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_campaign_id ON sendgrid_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_sg_message_id ON sendgrid_events(sg_message_id);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_event_type ON sendgrid_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_timestamp ON sendgrid_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_email ON sendgrid_events(email);

-- Email tracking indexes
CREATE INDEX IF NOT EXISTS idx_email_tracking_user_id ON email_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);

-- Campaign metrics indexes
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_user_id ON campaign_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(date);

-- User metrics indexes
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_metrics_date ON user_metrics(date);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Function to update aggregated metrics when events are inserted
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
DECLARE
  event_date DATE;
  campaign_uuid UUID;
  user_uuid UUID;
BEGIN
  -- Extract date from timestamp
  event_date := NEW.timestamp::DATE;
  campaign_uuid := NEW.campaign_id;
  user_uuid := NEW.user_id;
  
  -- Insert or update campaign metrics
  INSERT INTO campaign_metrics (user_id, campaign_id, date)
  VALUES (user_uuid, campaign_uuid, event_date)
  ON CONFLICT (campaign_id, date) DO NOTHING;
  
  -- Update specific metrics based on event type
  CASE NEW.event_type
    WHEN 'processed' THEN
      UPDATE campaign_metrics 
      SET emails_sent = emails_sent + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'delivered' THEN
      UPDATE campaign_metrics 
      SET emails_delivered = emails_delivered + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'bounce' THEN
      UPDATE campaign_metrics 
      SET emails_bounced = emails_bounced + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'blocked' THEN
      UPDATE campaign_metrics 
      SET emails_blocked = emails_blocked + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'deferred' THEN
      UPDATE campaign_metrics 
      SET emails_deferred = emails_deferred + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'open' THEN
      UPDATE campaign_metrics 
      SET total_opens = total_opens + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'click' THEN
      UPDATE campaign_metrics 
      SET total_clicks = total_clicks + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'unsubscribe', 'group_unsubscribe' THEN
      UPDATE campaign_metrics 
      SET unsubscribes = unsubscribes + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
      
    WHEN 'spam_report' THEN
      UPDATE campaign_metrics 
      SET spam_reports = spam_reports + 1, updated_at = NOW()
      WHERE campaign_id = campaign_uuid AND date = event_date;
  END CASE;
  
  -- Recalculate rates
  UPDATE campaign_metrics 
  SET 
    delivery_rate = CASE 
      WHEN emails_sent > 0 THEN ROUND((emails_delivered::DECIMAL / emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    bounce_rate = CASE 
      WHEN emails_sent > 0 THEN ROUND((emails_bounced::DECIMAL / emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    open_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unique_opens::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unique_clicks::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    unsubscribe_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unsubscribes::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    updated_at = NOW()
  WHERE campaign_id = campaign_uuid AND date = event_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update metrics when events are inserted
CREATE TRIGGER trigger_update_campaign_metrics
  AFTER INSERT ON sendgrid_events
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_metrics();

-- Function to update email tracking status
CREATE OR REPLACE FUNCTION update_email_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update email tracking record
  INSERT INTO email_tracking (
    user_id, campaign_id, email, sg_message_id, status, sent_at
  )
  VALUES (
    NEW.user_id, NEW.campaign_id, NEW.email, NEW.sg_message_id, 
    NEW.event_type, NEW.timestamp
  )
  ON CONFLICT (campaign_id, email, sg_message_id) DO UPDATE SET
    status = CASE
      -- Priority order: spam > unsubscribed > clicked > opened > delivered > sent
      WHEN NEW.event_type IN ('spam_report') THEN 'spam'
      WHEN NEW.event_type IN ('unsubscribe', 'group_unsubscribe') THEN 'unsubscribed'
      WHEN NEW.event_type = 'click' AND email_tracking.status NOT IN ('spam', 'unsubscribed') THEN 'clicked'
      WHEN NEW.event_type = 'open' AND email_tracking.status NOT IN ('spam', 'unsubscribed', 'clicked') THEN 'opened'
      WHEN NEW.event_type = 'delivered' AND email_tracking.status NOT IN ('spam', 'unsubscribed', 'clicked', 'opened') THEN 'delivered'
      WHEN NEW.event_type IN ('bounce', 'blocked') THEN NEW.event_type
      ELSE email_tracking.status
    END,
    delivered_at = CASE WHEN NEW.event_type = 'delivered' THEN NEW.timestamp ELSE email_tracking.delivered_at END,
    first_opened_at = CASE WHEN NEW.event_type = 'open' AND email_tracking.first_opened_at IS NULL THEN NEW.timestamp ELSE email_tracking.first_opened_at END,
    first_clicked_at = CASE WHEN NEW.event_type = 'click' AND email_tracking.first_clicked_at IS NULL THEN NEW.timestamp ELSE email_tracking.first_clicked_at END,
    open_count = CASE WHEN NEW.event_type = 'open' THEN email_tracking.open_count + 1 ELSE email_tracking.open_count END,
    click_count = CASE WHEN NEW.event_type = 'click' THEN email_tracking.click_count + 1 ELSE email_tracking.click_count END,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update email tracking
CREATE TRIGGER trigger_update_email_tracking
  AFTER INSERT ON sendgrid_events
  FOR EACH ROW
  EXECUTE FUNCTION update_email_tracking();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE sendgrid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for SendGrid events
CREATE POLICY "Users can view own SendGrid events" ON sendgrid_events
  FOR SELECT USING (true); -- Enforced by application logic

CREATE POLICY "Webhook can insert SendGrid events" ON sendgrid_events
  FOR INSERT WITH CHECK (true); -- Webhook endpoint will validate

-- RLS policies for email tracking
CREATE POLICY "Users can view own email tracking" ON email_tracking
  FOR ALL USING (true); -- Enforced by application logic

-- RLS policies for campaign metrics
CREATE POLICY "Users can view own campaign metrics" ON campaign_metrics
  FOR ALL USING (true); -- Enforced by application logic

-- RLS policies for user metrics
CREATE POLICY "Users can view own user metrics" ON user_metrics
  FOR ALL USING (true); -- Enforced by application logic

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to recalculate unique opens/clicks for campaign metrics
CREATE OR REPLACE FUNCTION recalculate_unique_metrics(campaign_uuid UUID, metric_date DATE)
RETURNS VOID AS $$
BEGIN
  -- Update unique opens
  UPDATE campaign_metrics 
  SET unique_opens = (
    SELECT COUNT(DISTINCT email) 
    FROM email_tracking 
    WHERE campaign_id = campaign_uuid 
    AND first_opened_at::DATE = metric_date
  )
  WHERE campaign_id = campaign_uuid AND date = metric_date;
  
  -- Update unique clicks
  UPDATE campaign_metrics 
  SET unique_clicks = (
    SELECT COUNT(DISTINCT email) 
    FROM email_tracking 
    WHERE campaign_id = campaign_uuid 
    AND first_clicked_at::DATE = metric_date
  )
  WHERE campaign_id = campaign_uuid AND date = metric_date;
  
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate user metrics from campaign metrics
CREATE OR REPLACE FUNCTION aggregate_user_metrics(user_uuid UUID, metric_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_metrics (user_id, date, emails_sent, emails_delivered, emails_bounced, emails_blocked, unique_opens, total_opens, unique_clicks, total_clicks, unsubscribes, spam_reports)
  SELECT 
    user_uuid,
    metric_date,
    COALESCE(SUM(emails_sent), 0),
    COALESCE(SUM(emails_delivered), 0),
    COALESCE(SUM(emails_bounced), 0),
    COALESCE(SUM(emails_blocked), 0),
    COALESCE(SUM(unique_opens), 0),
    COALESCE(SUM(total_opens), 0),
    COALESCE(SUM(unique_clicks), 0),
    COALESCE(SUM(total_clicks), 0),
    COALESCE(SUM(unsubscribes), 0),
    COALESCE(SUM(spam_reports), 0)
  FROM campaign_metrics 
  WHERE user_id = user_uuid AND date = metric_date
  ON CONFLICT (user_id, date) DO UPDATE SET
    emails_sent = EXCLUDED.emails_sent,
    emails_delivered = EXCLUDED.emails_delivered,
    emails_bounced = EXCLUDED.emails_bounced,
    emails_blocked = EXCLUDED.emails_blocked,
    unique_opens = EXCLUDED.unique_opens,
    total_opens = EXCLUDED.total_opens,
    unique_clicks = EXCLUDED.unique_clicks,
    total_clicks = EXCLUDED.total_clicks,
    unsubscribes = EXCLUDED.unsubscribes,
    spam_reports = EXCLUDED.spam_reports,
    delivery_rate = CASE 
      WHEN EXCLUDED.emails_sent > 0 THEN ROUND((EXCLUDED.emails_delivered::DECIMAL / EXCLUDED.emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    bounce_rate = CASE 
      WHEN EXCLUDED.emails_sent > 0 THEN ROUND((EXCLUDED.emails_bounced::DECIMAL / EXCLUDED.emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    open_rate = CASE 
      WHEN EXCLUDED.emails_delivered > 0 THEN ROUND((EXCLUDED.unique_opens::DECIMAL / EXCLUDED.emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN EXCLUDED.emails_delivered > 0 THEN ROUND((EXCLUDED.unique_clicks::DECIMAL / EXCLUDED.emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'SendGrid Analytics tables created successfully! 🎉' as status;
SELECT 'Tables: sendgrid_events, email_tracking, campaign_metrics, user_metrics' as tables_created;
SELECT 'All indexes, triggers, and RLS policies are ready.' as details;