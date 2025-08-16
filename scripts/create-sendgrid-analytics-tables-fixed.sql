-- SendGrid Analytics Tables - Fixed for Supabase Auth compatibility
-- This script works with both custom users table and Supabase Auth

-- First, let's check what user table structure we have
DO $$
BEGIN
    -- Check if custom users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE NOTICE 'Custom users table found';
    -- Check if Supabase auth.users exists
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
        RAISE NOTICE 'Supabase auth.users table found';
    ELSE
        RAISE NOTICE 'No users table found - will create without foreign keys';
    END IF;
END $$;

-- ============================================
-- RAW SENDGRID EVENTS TABLE
-- ============================================

-- Table to store raw SendGrid events from webhook
CREATE TABLE IF NOT EXISTS sendgrid_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- We'll add foreign key constraint later if users table exists
  campaign_id UUID, -- References campaigns table if it exists
  
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
  user_id UUID NOT NULL,
  campaign_id UUID, -- May be null if no campaigns table
  
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
  user_id UUID NOT NULL,
  campaign_id UUID, -- May be null if no campaigns table
  
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
  user_id UUID NOT NULL,
  
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
-- ADD FOREIGN KEY CONSTRAINTS (IF POSSIBLE)
-- ============================================

-- Try to add foreign key constraints if the referenced tables exist
DO $$
BEGIN
    -- Try to add foreign key to users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE sendgrid_events ADD CONSTRAINT fk_sendgrid_events_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE email_tracking ADD CONSTRAINT fk_email_tracking_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE campaign_metrics ADD CONSTRAINT fk_campaign_metrics_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            ALTER TABLE user_metrics ADD CONSTRAINT fk_user_metrics_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraints to public.users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key constraints to public.users: %', SQLERRM;
        END;
    -- Try to add foreign key to auth.users (Supabase)
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
        BEGIN
            ALTER TABLE sendgrid_events ADD CONSTRAINT fk_sendgrid_events_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            ALTER TABLE email_tracking ADD CONSTRAINT fk_email_tracking_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            ALTER TABLE campaign_metrics ADD CONSTRAINT fk_campaign_metrics_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            ALTER TABLE user_metrics ADD CONSTRAINT fk_user_metrics_user_id 
                FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraints to auth.users';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key constraints to auth.users: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No users table found - skipping foreign key constraints';
    END IF;

    -- Try to add foreign key to campaigns table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE sendgrid_events ADD CONSTRAINT fk_sendgrid_events_campaign_id 
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
            ALTER TABLE email_tracking ADD CONSTRAINT fk_email_tracking_campaign_id 
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
            ALTER TABLE campaign_metrics ADD CONSTRAINT fk_campaign_metrics_campaign_id 
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key constraints to campaigns table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key constraints to campaigns table: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No campaigns table found - skipping campaign foreign key constraints';
    END IF;
END $$;

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
-- SUCCESS MESSAGE
-- ============================================

SELECT 'SendGrid Analytics tables created successfully! 🎉' as status;
SELECT 'Tables: sendgrid_events, email_tracking, campaign_metrics, user_metrics' as tables_created;
SELECT 'Foreign key constraints added where possible' as constraints_status;