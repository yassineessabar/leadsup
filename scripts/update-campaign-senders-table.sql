-- Update campaign_senders table to include Gmail account fields
-- This consolidates gmail_accounts functionality into campaign_senders

-- Drop the existing campaign_senders table if it exists (be careful with this in production!)
DROP TABLE IF EXISTS campaign_senders;

-- Create new campaign_senders table with all Gmail account fields
CREATE TABLE campaign_senders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Campaign association
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Gmail account details (from gmail_accounts table)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  profile_picture TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Additional sender fields
  sender_type TEXT DEFAULT 'email' CHECK (sender_type IN ('email', 'sms')),
  health_score INTEGER DEFAULT 75,
  daily_limit INTEGER DEFAULT 50,
  warmup_status TEXT DEFAULT 'inactive',
  is_active BOOLEAN DEFAULT TRUE,
  is_selected BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(campaign_id, email),
  UNIQUE(user_id, email, campaign_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_senders_campaign_id ON campaign_senders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_senders_user_id ON campaign_senders(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_senders_email ON campaign_senders(email);
CREATE INDEX IF NOT EXISTS idx_campaign_senders_expires_at ON campaign_senders(expires_at);

-- Enable RLS
ALTER TABLE campaign_senders ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can manage own campaign senders" ON campaign_senders
  FOR ALL USING (user_id IN (SELECT user_id FROM user_sessions WHERE session_token = current_setting('request.cookies.session', true)::text));

-- Add trigger for updated_at
CREATE TRIGGER campaign_senders_updated_at 
  BEFORE UPDATE ON campaign_senders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE campaign_senders IS 'Gmail accounts associated with campaigns (consolidates gmail_accounts functionality)';
COMMENT ON COLUMN campaign_senders.campaign_id IS 'Reference to the campaign';
COMMENT ON COLUMN campaign_senders.user_id IS 'Reference to the user who owns this account';
COMMENT ON COLUMN campaign_senders.email IS 'Gmail email address';
COMMENT ON COLUMN campaign_senders.access_token IS 'OAuth access token for Gmail API';
COMMENT ON COLUMN campaign_senders.refresh_token IS 'OAuth refresh token';
COMMENT ON COLUMN campaign_senders.expires_at IS 'When the access token expires';

SELECT 'Updated campaign_senders table with Gmail account fields! 🎉' as status;