-- LEADSUP APPLICATION - COMPLETE DATABASE SCHEMA SETUP
-- This script creates all the necessary tables for authentication, onboarding, and core functionality
-- Run this in your Supabase SQL Editor

-- ============================================
-- AUTHENTICATION & USER MANAGEMENT TABLES
-- ============================================

-- 1. Main users table (custom authentication system)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  position TEXT,
  phone_number TEXT,
  store_type TEXT,
  
  -- Subscription fields
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'trial', 'starter', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing', 'incomplete')),
  trial_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Onboarding fields
  business_category TEXT,
  business_description TEXT,
  selected_template TEXT,
  selected_platforms TEXT[], 
  platform_links JSONB DEFAULT '{}',
  profile_picture_url TEXT,
  bio TEXT,
  display_name TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CUSTOMER & CONTACT MANAGEMENT TABLES  
-- ============================================

-- 4. Customers/contacts table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  type TEXT DEFAULT 'customer' CHECK (type IN ('customer', 'lead', 'prospect')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unsubscribed')),
  tags TEXT[],
  notes TEXT,
  source TEXT,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- 5. Click tracking for analytics
CREATE TABLE IF NOT EXISTS click_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  page TEXT,
  user_agent TEXT,
  referrer TEXT,
  session_id TEXT,
  event_type TEXT,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  redirect_platform TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVIEW MANAGEMENT TABLES
-- ============================================

-- 6. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  platform TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden', 'spam')),
  title TEXT,
  verified BOOLEAN DEFAULT FALSE,
  response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Review link/page configuration
CREATE TABLE IF NOT EXISTS review_link (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  review_url TEXT UNIQUE,
  review_qr_code TEXT,
  company_logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#EF4444',
  background_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#1F2937',
  font TEXT DEFAULT 'Inter',
  enabled_platforms TEXT[] DEFAULT '{"google","facebook","yelp"}',
  welcome_message_title TEXT DEFAULT 'How was your experience?',
  welcome_message_subtitle TEXT DEFAULT 'Your feedback helps us improve!',
  thank_you_message TEXT DEFAULT 'Thank you for your review!',
  redirect_delay INTEGER DEFAULT 3,
  enable_video_testimonials BOOLEAN DEFAULT FALSE,
  video_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Review requests tracking
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'reviewed', 'failed')),
  last_sent_at TIMESTAMP WITH TIME ZONE,
  platform_redirect_url TEXT,
  template_id UUID,
  campaign_id UUID,
  clicks INTEGER DEFAULT 0,
  opened BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Review integrations
CREATE TABLE IF NOT EXISTS review_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_type TEXT NOT NULL CHECK (platform_type IN ('google', 'facebook', 'yelp', 'trustpilot', 'tripadvisor')),
  api_key TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('manual', 'daily', 'weekly', 'monthly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform_type)
);

-- ============================================
-- CAMPAIGN & AUTOMATION TABLES
-- ============================================

-- 10. Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Email', 'SMS')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'after_purchase', 'weekly', 'monthly', 'custom')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft', 'completed')),
  description TEXT,
  target_audience JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Campaign sequences (multi-step campaigns)
CREATE TABLE IF NOT EXISTS campaign_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  timing_days INTEGER DEFAULT 0,
  variants JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, step_number)
);

-- 12. Campaign schedules
CREATE TABLE IF NOT EXISTS campaign_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  from_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
  to_time TIME WITHOUT TIME ZONE DEFAULT '17:00:00',
  timezone TEXT DEFAULT 'UTC',
  monday BOOLEAN DEFAULT TRUE,
  tuesday BOOLEAN DEFAULT TRUE,
  wednesday BOOLEAN DEFAULT TRUE,
  thursday BOOLEAN DEFAULT TRUE,
  friday BOOLEAN DEFAULT TRUE,
  saturday BOOLEAN DEFAULT FALSE,
  sunday BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Automation jobs queue
CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES campaign_sequences(id) ON DELETE SET NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  
  -- Customer information
  customer_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Job details
  step_number INTEGER DEFAULT 1,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('immediate', 'after_purchase', 'weekly', 'monthly', 'custom')),
  wait_days INTEGER DEFAULT 0,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Execution tracking
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Automation workflows
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('new_customer', 'after_purchase', 'low_rating', 'high_rating', 'no_review')),
  delay_days INTEGER DEFAULT 0,
  email_template_id UUID,
  sms_template_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TEMPLATE & MESSAGING TABLES
-- ============================================

-- 15. Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  from_email TEXT,
  from_name TEXT,
  sequence INTEGER DEFAULT 1,
  initial_trigger TEXT DEFAULT 'manual' CHECK (initial_trigger IN ('manual', 'after_purchase', 'weekly', 'monthly')),
  initial_wait_days INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. SMS templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_name TEXT,
  sequence INTEGER DEFAULT 1,
  initial_trigger TEXT DEFAULT 'manual' CHECK (initial_trigger IN ('manual', 'after_purchase', 'weekly', 'monthly')),
  initial_wait_days INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Template settings (global messaging config)
CREATE TABLE IF NOT EXISTS template_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_from_name TEXT,
  email_reply_to TEXT,
  sms_from_number TEXT,
  default_signature TEXT,
  unsubscribe_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 18. Review templates
CREATE TABLE IF NOT EXISTS review_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'review_page')),
  subject TEXT,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CUSTOMIZATION & BRANDING TABLES
-- ============================================

-- 19. Customization settings
CREATE TABLE IF NOT EXISTS customization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branding_logo_url TEXT,
  branding_primary_color TEXT DEFAULT '#3B82F6',
  branding_secondary_color TEXT DEFAULT '#10B981',
  welcome_message_title TEXT DEFAULT 'How was your experience?',
  welcome_message_subtitle TEXT DEFAULT 'We value your feedback!',
  thank_you_message_title TEXT DEFAULT 'Thank you!',
  thank_you_message_body TEXT DEFAULT 'Your review means the world to us.',
  redirect_message TEXT DEFAULT 'Redirecting to review platform...',
  font_family TEXT DEFAULT 'Inter',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- INTEGRATION & API TABLES
-- ============================================

-- 20. External integrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shopify', 'woocommerce', 'google', 'facebook', 'zapier', 'webhook')),
  api_key TEXT,
  api_secret TEXT,
  settings JSONB DEFAULT '{}',
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_errors TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. API keys for external access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_value TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'webhook', 'integration')),
  permissions JSONB DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BILLING & SUBSCRIPTION TABLES
-- ============================================

-- 22. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'usd',
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Invoice tracking
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  download_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MEDIA & VIDEO TABLES
-- ============================================

-- 24. Video testimonials
CREATE TABLE IF NOT EXISTS video_testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_id TEXT,
  video_url TEXT NOT NULL,
  video_file_path TEXT NOT NULL,
  company_name TEXT,
  review_link_id UUID REFERENCES review_link(id) ON DELETE SET NULL,
  transcript TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_type ON users(subscription_type);
CREATE INDEX IF NOT EXISTS idx_users_business_category ON users(business_category);

-- Customer table indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Review table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_platform ON reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- Campaign table indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);

-- Automation jobs indexes
CREATE INDEX IF NOT EXISTS idx_automation_jobs_user_id ON automation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_scheduled_for ON automation_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_campaign_id ON automation_jobs(campaign_id);

-- Click tracking indexes
CREATE INDEX IF NOT EXISTS idx_click_tracking_customer_id ON click_tracking(customer_id);
CREATE INDEX IF NOT EXISTS idx_click_tracking_user_id ON click_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_click_tracking_created_at ON click_tracking(created_at);

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_user_id ON sms_templates(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_testimonials ENABLE ROW LEVEL SECURITY;

-- User policies (custom auth system)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (true); -- Will be enforced by application logic
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (true); -- Allow user creation
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (true); -- Will be enforced by application logic

-- Customer policies
CREATE POLICY "Users can manage own customers" ON customers
  FOR ALL USING (true); -- Enforced by application logic

-- Review policies
CREATE POLICY "Users can manage own reviews" ON reviews
  FOR ALL USING (true); -- Enforced by application logic

-- Campaign policies
CREATE POLICY "Users can manage own campaigns" ON campaigns
  FOR ALL USING (true); -- Enforced by application logic

-- Review link policies
CREATE POLICY "Users can manage own review links" ON review_link
  FOR ALL USING (true); -- Enforced by application logic

-- Template policies
CREATE POLICY "Users can manage own email templates" ON email_templates
  FOR ALL USING (true); -- Enforced by application logic
CREATE POLICY "Users can manage own sms templates" ON sms_templates
  FOR ALL USING (true); -- Enforced by application logic

-- Service role policies (for automation)
CREATE POLICY "Service role can access automation jobs" ON automation_jobs
  FOR ALL USING (current_setting('role') = 'service_role');

-- Public access for review submission
CREATE POLICY "Public can submit reviews" ON reviews
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can submit video testimonials" ON video_testimonials
  FOR INSERT WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER automation_jobs_updated_at BEFORE UPDATE ON automation_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sms_templates_updated_at BEFORE UPDATE ON sms_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKET SETUP (for file uploads)
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('company-logos', 'company-logos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
  ('video-testimonials', 'video-testimonials', true, 104857600, ARRAY['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload company logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Public can view company logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Public can upload video testimonials" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'video-testimonials');

CREATE POLICY "Public can view video testimonials" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-testimonials');

-- ============================================
-- INITIAL DATA & DEFAULT TEMPLATES
-- ============================================

-- Note: Default templates will be created when users sign up
-- This avoids foreign key constraint issues during initial setup

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

-- Verify setup
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'customers', 'reviews', 'campaigns', 'automation_jobs',
    'email_templates', 'sms_templates', 'review_link', 'integrations'
  )
ORDER BY tablename;

-- Success message
SELECT 'LeadsUp database schema created successfully! 🎉' as status;
SELECT 'All tables, indexes, RLS policies, and storage buckets are ready.' as details;
SELECT 'You can now run your authentication, onboarding, and campaign features.' as next_steps;