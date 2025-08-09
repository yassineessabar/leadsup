-- Create contact_sequences table to track email sequence progress for each contact
CREATE TABLE IF NOT EXISTS contact_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES campaign_sequences(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  sender_account VARCHAR(255), -- Email address of the account used to send
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  UNIQUE(contact_id, sequence_id),
  INDEX idx_contact_sequences_contact_id (contact_id),
  INDEX idx_contact_sequences_sequence_id (sequence_id),
  INDEX idx_contact_sequences_status (status),
  INDEX idx_contact_sequences_scheduled_for (scheduled_for)
);

-- Add columns to campaigns table to track automation stats
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS emails_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_failed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_pending INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE;

-- Add timezone support to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS time_zone VARCHAR(50) DEFAULT 'UTC';

-- Add campaign reference to contacts (if not already exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create automation_logs table for debugging and monitoring
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES campaign_sequences(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'email_sent', 'email_failed', 'sequence_started', etc.
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_automation_logs_campaign_id (campaign_id),
  INDEX idx_automation_logs_created_at (created_at),
  INDEX idx_automation_logs_action (action)
);

-- Create automation_settings table for global n8n configuration
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  n8n_webhook_url VARCHAR(500),
  n8n_api_key VARCHAR(255),
  automation_enabled BOOLEAN DEFAULT true,
  processing_interval_minutes INTEGER DEFAULT 15,
  max_emails_per_batch INTEGER DEFAULT 50,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- One settings record per user
  UNIQUE(user_id)
);

-- Enable RLS (Row Level Security) on new tables
ALTER TABLE contact_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_sequences
CREATE POLICY contact_sequences_policy ON contact_sequences
  FOR ALL
  USING (
    contact_id IN (
      SELECT id FROM contacts 
      WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE user_id = auth.uid()
      )
    )
  );

-- Create RLS policies for automation_logs
CREATE POLICY automation_logs_policy ON automation_logs
  FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for automation_settings
CREATE POLICY automation_settings_policy ON automation_settings
  FOR ALL
  USING (user_id = auth.uid());

-- Create function to automatically update contact_sequences updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contact_sequences
DROP TRIGGER IF EXISTS contact_sequences_updated_at_trigger ON contact_sequences;
CREATE TRIGGER contact_sequences_updated_at_trigger
  BEFORE UPDATE ON contact_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_sequences_updated_at();

-- Create function to log automation events
CREATE OR REPLACE FUNCTION log_automation_event(
  p_campaign_id UUID,
  p_contact_id UUID DEFAULT NULL,
  p_sequence_id UUID DEFAULT NULL,
  p_action VARCHAR(50),
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO automation_logs (campaign_id, contact_id, sequence_id, action, details)
  VALUES (p_campaign_id, p_contact_id, p_sequence_id, p_action, p_details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON contact_sequences TO authenticated;
GRANT ALL ON automation_logs TO authenticated;
GRANT ALL ON automation_settings TO authenticated;

-- Insert some sample automation settings for existing users (optional)
-- INSERT INTO automation_settings (user_id, automation_enabled)
-- SELECT id, true FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;