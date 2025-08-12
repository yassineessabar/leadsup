-- Domain Management Database Schema
-- Run this in your Supabase SQL editor

-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) DEFAULT 'reply',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  verification_type VARCHAR(50) DEFAULT 'manual' CHECK (verification_type IN ('manual', 'cloudflare', 'godaddy', 'auto')),
  dns_provider VARCHAR(100),
  
  -- DNS Configuration
  spf_record TEXT,
  dkim_record TEXT,
  mx_record TEXT,
  verification_token VARCHAR(255),
  
  -- Statistics (will be updated by webhooks/cron jobs)
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_rejected INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  
  -- Metadata
  is_test_domain BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(domain, user_id),
  
  -- Indexes
  INDEX idx_domains_user_id (user_id),
  INDEX idx_domains_status (status),
  INDEX idx_domains_domain (domain)
);

-- Create domain verification logs table
CREATE TABLE IF NOT EXISTS domain_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  dns_records_checked JSONB,
  verification_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_verification_logs_domain_id (domain_id),
  INDEX idx_verification_logs_created_at (created_at)
);

-- Add domain_id to existing campaign_senders table
ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id),
ADD COLUMN IF NOT EXISTS sender_domain VARCHAR(255);

-- Create index for campaign_senders domain lookup
CREATE INDEX IF NOT EXISTS idx_campaign_senders_domain_id ON campaign_senders(domain_id);

-- Insert default LeadsUp domains
INSERT INTO domains (
  user_id, 
  domain, 
  subdomain, 
  status, 
  verification_type, 
  description,
  is_test_domain,
  emails_sent,
  emails_delivered,
  emails_rejected,
  emails_received,
  verified_at
) VALUES 
-- Main LeadsUp domain (system-wide)
(
  '00000000-0000-0000-0000-000000000000', -- System user
  'leadsup.io',
  'reply',
  'verified',
  'manual',
  'Main LeadsUp sending domain',
  false,
  12500,
  11800,
  700,
  3420,
  NOW()
),
-- Reply subdomain
(
  '00000000-0000-0000-0000-000000000000', -- System user
  'reply.leadsup.io',
  'reply',
  'verified',
  'manual',
  'LeadsUp reply handling domain',
  false,
  0,
  0,
  0,
  8560,
  NOW()
)
ON CONFLICT (domain, user_id) DO NOTHING;

-- Create RLS (Row Level Security) policies
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own domains
CREATE POLICY "Users can manage their own domains" ON domains
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can only access verification logs for their domains
CREATE POLICY "Users can access their domain verification logs" ON domain_verification_logs
  FOR ALL USING (
    domain_id IN (
      SELECT id FROM domains WHERE user_id = auth.uid()
    )
  );

-- Create function to update domain statistics
CREATE OR REPLACE FUNCTION update_domain_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sent count when email is sent
  IF TG_OP = 'INSERT' AND NEW.status = 'sent' THEN
    UPDATE domains 
    SET emails_sent = emails_sent + 1
    WHERE domain = split_part(NEW.sender_email, '@', 2);
  END IF;
  
  -- Update delivered count when email is delivered
  IF TG_OP = 'UPDATE' AND OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
    UPDATE domains 
    SET emails_delivered = emails_delivered + 1
    WHERE domain = split_part(NEW.sender_email, '@', 2);
  END IF;
  
  -- Update rejected count when email is rejected
  IF TG_OP = 'UPDATE' AND OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    UPDATE domains 
    SET emails_rejected = emails_rejected + 1
    WHERE domain = split_part(NEW.sender_email, '@', 2);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update domain stats from inbox_messages
CREATE OR REPLACE FUNCTION update_domain_received_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update received count when reply is received
  IF TG_OP = 'INSERT' AND NEW.direction = 'inbound' THEN
    UPDATE domains 
    SET emails_received = emails_received + 1
    WHERE domain = split_part(NEW.sender_email, '@', 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (if inbox_messages table exists)
DROP TRIGGER IF EXISTS trigger_update_domain_stats ON inbox_messages;
CREATE TRIGGER trigger_update_domain_stats
  AFTER INSERT OR UPDATE ON inbox_messages
  FOR EACH ROW EXECUTE FUNCTION update_domain_received_stats();

-- Create function to check domain ownership
CREATE OR REPLACE FUNCTION check_domain_ownership(domain_name TEXT, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM domains 
    WHERE domain = domain_name 
    AND user_id = user_uuid 
    AND status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON domains TO authenticated;
GRANT ALL ON domain_verification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION check_domain_ownership TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE domains IS 'User-owned domains for email sending and receiving';
COMMENT ON TABLE domain_verification_logs IS 'Audit log of domain verification attempts';
COMMENT ON COLUMN domains.verification_type IS 'How the domain was/will be verified: manual, cloudflare, godaddy, auto';
COMMENT ON COLUMN domains.status IS 'Current verification status: pending, verified, failed';
COMMENT ON COLUMN domains.subdomain IS 'Subdomain for replies (e.g., reply.domain.com)';

-- Create view for domain statistics dashboard
CREATE OR REPLACE VIEW domain_stats_summary AS
SELECT 
  d.id,
  d.domain,
  d.status,
  d.verification_type,
  d.is_test_domain,
  d.created_at,
  d.verified_at,
  -- Email statistics
  d.emails_sent,
  d.emails_delivered,
  d.emails_rejected,
  d.emails_received,
  -- Calculated metrics
  CASE 
    WHEN d.emails_sent > 0 THEN 
      ROUND((d.emails_delivered::DECIMAL / d.emails_sent) * 100, 2)
    ELSE 0 
  END AS delivery_rate,
  CASE 
    WHEN d.emails_sent > 0 THEN 
      ROUND((d.emails_rejected::DECIMAL / d.emails_sent) * 100, 2)
    ELSE 0 
  END AS rejection_rate,
  -- Recent verification attempts
  (
    SELECT COUNT(*) 
    FROM domain_verification_logs dvl 
    WHERE dvl.domain_id = d.id 
    AND dvl.created_at >= NOW() - INTERVAL '7 days'
  ) AS recent_verification_attempts
FROM domains d;

GRANT SELECT ON domain_stats_summary TO authenticated;