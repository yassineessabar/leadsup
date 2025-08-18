-- Warming System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- 1. Warming campaigns tracking table
CREATE TABLE IF NOT EXISTS warmup_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sender_email VARCHAR(255) NOT NULL,
  sender_account_id UUID REFERENCES sender_accounts(id),
  
  -- Warming progress
  phase INTEGER DEFAULT 1 CHECK (phase IN (1, 2, 3)),
  day_in_phase INTEGER DEFAULT 1,
  total_warming_days INTEGER DEFAULT 0,
  
  -- Daily targets and tracking
  daily_target INTEGER DEFAULT 5,
  emails_sent_today INTEGER DEFAULT 0,
  opens_today INTEGER DEFAULT 0,
  replies_today INTEGER DEFAULT 0,
  clicks_today INTEGER DEFAULT 0,
  
  -- Health score tracking
  initial_health_score INTEGER DEFAULT 0,
  current_health_score INTEGER DEFAULT 0,
  target_health_score INTEGER DEFAULT 90,
  
  -- Status and timing
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  last_reset_at TIMESTAMPTZ DEFAULT NOW(), -- For daily counter resets
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(campaign_id, sender_email)
);

-- 2. Warming activities log
CREATE TABLE IF NOT EXISTS warmup_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warmup_campaign_id UUID NOT NULL REFERENCES warmup_campaigns(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('send', 'open', 'reply', 'click')),
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT,
  
  -- SendGrid tracking
  message_id VARCHAR(255),
  sendgrid_message_id VARCHAR(255),
  
  -- Scheduling and execution
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  
  -- Metadata
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Warming email templates
CREATE TABLE IF NOT EXISTS warmup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template details
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('transactional', 'informational', 'conversational')),
  phase INTEGER CHECK (phase IN (1, 2, 3)), -- NULL means all phases
  
  -- Email content
  subject_templates TEXT[] NOT NULL, -- Array of subject line variants
  content_templates TEXT[] NOT NULL, -- Array of content variants
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  weight INTEGER DEFAULT 1, -- For random selection weighting
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Warming recipients pool
CREATE TABLE IF NOT EXISTS warmup_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient details
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  domain VARCHAR(255) NOT NULL,
  
  -- Recipient settings
  is_active BOOLEAN DEFAULT true,
  max_daily_emails INTEGER DEFAULT 10,
  emails_received_today INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Warming statistics (daily rollup)
CREATE TABLE IF NOT EXISTS warmup_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warmup_campaign_id UUID NOT NULL REFERENCES warmup_campaigns(id) ON DELETE CASCADE,
  
  -- Date and metrics
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  
  -- Calculated rates
  open_rate DECIMAL(5,2) DEFAULT 0,
  reply_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Health score on this day
  health_score INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(warmup_campaign_id, date)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_warmup_campaigns_status ON warmup_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_warmup_campaigns_campaign ON warmup_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_warmup_campaigns_sender ON warmup_campaigns(sender_email);
CREATE INDEX IF NOT EXISTS idx_warmup_campaigns_updated ON warmup_campaigns(updated_at);

CREATE INDEX IF NOT EXISTS idx_warmup_recipients_domain ON warmup_recipients(domain);
CREATE INDEX IF NOT EXISTS idx_warmup_recipients_active ON warmup_recipients(is_active);

CREATE INDEX IF NOT EXISTS idx_warmup_stats_date ON warmup_daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_warmup_stats_campaign_date ON warmup_daily_stats(warmup_campaign_id, date);

-- 7. Insert initial warming recipients (internal warming pool)
INSERT INTO warmup_recipients (email, name, domain) VALUES
  ('warmup1@leadsup.io', 'Warmup User 1', 'leadsup.io'),
  ('warmup2@leadsup.io', 'Warmup User 2', 'leadsup.io'),
  ('warmup3@leadsup.io', 'Warmup User 3', 'leadsup.io'),
  ('warmup4@leadsup.io', 'Warmup User 4', 'leadsup.io'),
  ('warmup5@leadsup.io', 'Warmup User 5', 'leadsup.io'),
  ('test1@mailwarm.co', 'Test User 1', 'mailwarm.co'),
  ('test2@mailwarm.co', 'Test User 2', 'mailwarm.co'),
  ('test3@mailwarm.co', 'Test User 3', 'mailwarm.co'),
  ('quality1@warmupflow.com', 'Quality User 1', 'warmupflow.com'),
  ('quality2@warmupflow.com', 'Quality User 2', 'warmupflow.com')
ON CONFLICT (email) DO NOTHING;

-- 8. Insert initial warming templates
INSERT INTO warmup_templates (name, category, phase, subject_templates, content_templates) VALUES
  (
    'Welcome Series', 
    'transactional', 
    1,
    ARRAY['Welcome to our platform!', 'Getting started guide', 'Your account is ready'],
    ARRAY[
      'Hi there! Welcome to our platform. We''re excited to have you on board.',
      'Hello! Your account has been successfully created. Here''s how to get started.',
      'Welcome! We''re here to help you succeed. Let us know if you need anything.'
    ]
  ),
  (
    'Tips and Updates',
    'informational',
    2, 
    ARRAY['Quick tip for today', 'Weekly update', 'New feature announcement'],
    ARRAY[
      'Here''s a quick tip to help improve your workflow.',
      'We wanted to share some updates about what''s new this week.',
      'We''ve added a new feature that we think you''ll love.'
    ]
  ),
  (
    'Check-in Messages',
    'conversational',
    3,
    ARRAY['How are things going?', 'Quick question', 'Following up'],
    ARRAY[
      'Hi! Just checking in to see how everything is going.',
      'Hope you''re having a great week! Any questions about anything?',
      'Following up on our previous conversation. How can we help?'
    ]
  )
ON CONFLICT DO NOTHING;

-- 9. Create RLS policies (if using Row Level Security)
-- ALTER TABLE warmup_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE warmup_activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE warmup_daily_stats ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can manage their own warmup campaigns" ON warmup_campaigns
--   FOR ALL USING (auth.uid() IN (
--     SELECT user_id FROM campaigns WHERE id = campaign_id
--   ));

-- 10. Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_warmup_campaigns_updated_at ON warmup_campaigns;
CREATE TRIGGER update_warmup_campaigns_updated_at BEFORE UPDATE ON warmup_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warmup_templates_updated_at ON warmup_templates;
CREATE TRIGGER update_warmup_templates_updated_at BEFORE UPDATE ON warmup_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warmup_recipients_updated_at ON warmup_recipients;
CREATE TRIGGER update_warmup_recipients_updated_at BEFORE UPDATE ON warmup_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_warmup_stats_updated_at ON warmup_daily_stats;
CREATE TRIGGER update_warmup_stats_updated_at BEFORE UPDATE ON warmup_daily_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_warmup_activities_scheduled ON warmup_activities(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_warmup_activities_campaign ON warmup_activities(warmup_campaign_id);
CREATE INDEX IF NOT EXISTS idx_warmup_activities_type ON warmup_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_warmup_templates_phase ON warmup_templates(phase);
CREATE INDEX IF NOT EXISTS idx_warmup_templates_category ON warmup_templates(category);

-- Success message
SELECT 'Warming system database schema created successfully!' as result;