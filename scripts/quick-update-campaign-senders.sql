-- Quick update to campaign_senders table for Gmail account consolidation
-- Run this immediately in your Supabase SQL Editor

-- First, drop the existing campaign_senders table if it exists 
DROP TABLE IF EXISTS campaign_senders CASCADE;

-- Create new campaign_senders table with Gmail account fields
CREATE TABLE campaign_senders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Campaign association
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Gmail account details
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  profile_picture TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Sender fields
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
  UNIQUE(campaign_id, email)
);

-- Create indexes
CREATE INDEX idx_campaign_senders_campaign_id ON campaign_senders(campaign_id);
CREATE INDEX idx_campaign_senders_user_id ON campaign_senders(user_id);
CREATE INDEX idx_campaign_senders_email ON campaign_senders(email);

-- Enable RLS
ALTER TABLE campaign_senders ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can manage campaign senders via app logic" ON campaign_senders
  FOR ALL USING (true); -- Enforced by application logic

-- Add updated_at trigger
CREATE TRIGGER campaign_senders_updated_at 
  BEFORE UPDATE ON campaign_senders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'Campaign senders table updated successfully! Gmail accounts will now save here. 🎉' as status;