-- Create domains table for domain management and verification
-- This table stores domains added by users for email sending

CREATE TABLE IF NOT EXISTS domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  description TEXT,
  verification_type TEXT DEFAULT 'manual' CHECK (verification_type IN ('manual', 'domain_connect', 'api')),
  
  -- Domain verification records
  verification_token TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_verification_attempt TIMESTAMP WITH TIME ZONE,
  verification_error TEXT,
  
  -- DNS records tracking
  dns_records JSONB DEFAULT '{}', -- Store DNS records that need to be added
  dns_status JSONB DEFAULT '{}', -- Track status of each DNS record
  
  -- Domain settings
  is_test_domain BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Sending configuration
  from_name TEXT,
  reply_to_email TEXT,
  dkim_selector TEXT DEFAULT 's1',
  
  -- Statistics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_rejected INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  
  -- Provider information (for Domain Connect)
  registrar_provider TEXT,
  domain_connect_supported BOOLEAN DEFAULT FALSE,
  domain_connect_setup_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, domain)
);

-- Create domain verification history table
CREATE TABLE IF NOT EXISTS domain_verification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  dns_records_checked JSONB,
  verification_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_verified_at ON domains(verified_at);
CREATE INDEX IF NOT EXISTS idx_domain_verification_history_domain_id ON domain_verification_history(domain_id);

-- Enable RLS
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verification_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own domains" ON domains
  FOR ALL USING (true); -- Will be enforced by application logic

CREATE POLICY "Users can view own domain verification history" ON domain_verification_history
  FOR SELECT USING (true); -- Will be enforced by application logic

-- Add updated_at trigger
CREATE TRIGGER domains_updated_at 
  BEFORE UPDATE ON domains 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();

-- Insert default DNS records function
CREATE OR REPLACE FUNCTION get_default_dns_records(domain_name TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_array(
    jsonb_build_object(
      'type', 'TXT',
      'name', '@',
      'value', 'v=spf1 include:sendgrid.net ~all',
      'purpose', 'Email authentication (SPF)',
      'required', true
    ),
    jsonb_build_object(
      'type', 'CNAME',
      'name', 's1._domainkey',
      'value', 's1.domainkey.u30435661.wl250.sendgrid.net',
      'purpose', 'Email signing (DKIM)',
      'required', true
    ),
    jsonb_build_object(
      'type', 'MX',
      'name', 'reply',
      'value', 'mx.sendgrid.net',
      'priority', 10,
      'purpose', 'Route replies to LeadsUp',
      'required', false
    ),
    jsonb_build_object(
      'type', 'TXT',
      'name', '_leadsup-verify',
      'value', 'leadsup-verify-' || extract(epoch from now())::text,
      'purpose', 'Domain verification',
      'required', true
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to generate verification token
CREATE OR REPLACE FUNCTION generate_domain_verification_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'leadsup-verify-' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Domains table created successfully! 🎉' as status;
SELECT 'Domain management and verification functionality is ready.' as details;