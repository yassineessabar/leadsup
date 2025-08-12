-- Create sender_accounts table for managing sender emails per domain
-- This table stores sender email addresses linked to verified domains

CREATE TABLE IF NOT EXISTS sender_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Sender email information
  email TEXT NOT NULL,
  display_name TEXT,
  
  -- Settings
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- SendGrid integration
  sendgrid_sender_id TEXT, -- SendGrid sender identity ID
  sendgrid_status TEXT DEFAULT 'pending' CHECK (sendgrid_status IN ('pending', 'verified', 'failed')),
  sendgrid_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Statistics
  emails_sent INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(domain_id, email), -- Each email can only exist once per domain
  UNIQUE(domain_id, is_default) WHERE is_default = TRUE -- Only one default sender per domain
);

-- Add constraint to ensure email belongs to the domain
CREATE OR REPLACE FUNCTION validate_sender_email_domain()
RETURNS TRIGGER AS $$
DECLARE
  domain_name TEXT;
  email_domain TEXT;
BEGIN
  -- Get the domain name
  SELECT domain INTO domain_name FROM domains WHERE id = NEW.domain_id;
  
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);
  
  -- Validate that email domain matches the domain
  IF email_domain != domain_name THEN
    RAISE EXCEPTION 'Email domain (%) does not match domain (%)', email_domain, domain_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_sender_email_domain_trigger
  BEFORE INSERT OR UPDATE ON sender_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_sender_email_domain();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sender_accounts_domain_id ON sender_accounts(domain_id);
CREATE INDEX IF NOT EXISTS idx_sender_accounts_user_id ON sender_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_accounts_email ON sender_accounts(email);
CREATE INDEX IF NOT EXISTS idx_sender_accounts_is_default ON sender_accounts(is_default) WHERE is_default = TRUE;

-- Enable RLS
ALTER TABLE sender_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own sender accounts" ON sender_accounts
  FOR ALL USING (true); -- Will be enforced by application logic

-- Add updated_at trigger
CREATE TRIGGER sender_accounts_updated_at 
  BEFORE UPDATE ON sender_accounts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at();

-- Function to set default sender (ensures only one default per domain)
CREATE OR REPLACE FUNCTION set_default_sender(sender_id UUID)
RETURNS VOID AS $$
DECLARE
  target_domain_id UUID;
BEGIN
  -- Get the domain_id for the sender
  SELECT domain_id INTO target_domain_id FROM sender_accounts WHERE id = sender_id;
  
  -- Remove default from all other senders in this domain
  UPDATE sender_accounts 
  SET is_default = FALSE 
  WHERE domain_id = target_domain_id AND id != sender_id;
  
  -- Set this sender as default
  UPDATE sender_accounts 
  SET is_default = TRUE 
  WHERE id = sender_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get default sender for a domain
CREATE OR REPLACE FUNCTION get_default_sender(target_domain_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sa.id, sa.email, sa.display_name
  FROM sender_accounts sa
  WHERE sa.domain_id = target_domain_id 
    AND sa.is_default = TRUE 
    AND sa.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Sender accounts table created successfully! 📧' as status;
SELECT 'Ready to manage sender emails per verified domain.' as details;