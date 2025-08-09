-- Fixed automation tables script for production deployment

-- Create contact_sequences table to track email sequence progress
CREATE TABLE IF NOT EXISTS contact_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  sequence_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  sender_account VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_sequences_contact_id ON contact_sequences (contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_sequences_sequence_id ON contact_sequences (sequence_id);
CREATE INDEX IF NOT EXISTS idx_contact_sequences_status ON contact_sequences (status);
CREATE INDEX IF NOT EXISTS idx_contact_sequences_scheduled_for ON contact_sequences (scheduled_for);

-- Add unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contact_sequences_contact_id_sequence_id_key'
  ) THEN
    ALTER TABLE contact_sequences ADD CONSTRAINT contact_sequences_contact_id_sequence_id_key UNIQUE(contact_id, sequence_id);
  END IF;
END $$;

-- Add columns to campaigns table to track automation stats
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS emails_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_failed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_pending INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE;

-- Create automation_logs table for debugging and monitoring
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  contact_id UUID,
  sequence_id UUID,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for automation_logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_campaign_id ON automation_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_action ON automation_logs (action);

-- Create automation_settings table for global n8n configuration
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  n8n_webhook_url VARCHAR(500),
  n8n_api_key VARCHAR(255),
  automation_enabled BOOLEAN DEFAULT true,
  processing_interval_minutes INTEGER DEFAULT 15,
  max_emails_per_batch INTEGER DEFAULT 50,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for automation_settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'automation_settings_user_id_key'
  ) THEN
    ALTER TABLE automation_settings ADD CONSTRAINT automation_settings_user_id_key UNIQUE(user_id);
  END IF;
END $$;

-- Enable RLS (Row Level Security) on new tables
ALTER TABLE contact_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_sequences (simplified for compatibility)
DROP POLICY IF EXISTS contact_sequences_policy ON contact_sequences;
CREATE POLICY contact_sequences_policy ON contact_sequences
  FOR ALL
  USING (true); -- Simplified policy - adjust based on your auth requirements

-- Create RLS policies for automation_logs (simplified for compatibility)
DROP POLICY IF EXISTS automation_logs_policy ON automation_logs;
CREATE POLICY automation_logs_policy ON automation_logs
  FOR ALL  
  USING (true); -- Simplified policy - adjust based on your auth requirements

-- Create RLS policies for automation_settings (simplified for compatibility)
DROP POLICY IF EXISTS automation_settings_policy ON automation_settings;
CREATE POLICY automation_settings_policy ON automation_settings
  FOR ALL
  USING (true); -- Simplified policy - adjust based on your auth requirements

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

-- Create helper function for campaign stats
CREATE OR REPLACE FUNCTION get_campaign_sequence_stats(campaign_uuid UUID)
RETURNS TABLE(status VARCHAR(20)) AS $$
BEGIN
  RETURN QUERY 
  SELECT cs.status
  FROM contact_sequences cs
  WHERE cs.contact_id IN (
    SELECT p.id FROM prospects p WHERE p.campaign_id = campaign_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON contact_sequences TO authenticated;
GRANT ALL ON automation_logs TO authenticated;
GRANT ALL ON automation_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_sequence_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_contact_sequences_updated_at() TO authenticated;

-- Verify everything was created
SELECT 'Table created: ' || tablename as status
FROM pg_tables 
WHERE tablename IN ('contact_sequences', 'automation_logs', 'automation_settings')
AND schemaname = 'public'

UNION ALL

SELECT 'Column added: campaigns.' || column_name
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND column_name IN ('emails_sent', 'emails_failed', 'emails_pending', 'last_processed_at')

UNION ALL

SELECT 'Function created: ' || routine_name
FROM information_schema.routines 
WHERE routine_name IN ('get_campaign_sequence_stats', 'update_contact_sequences_updated_at')
AND routine_schema = 'public';

-- Final success message
SELECT '✅ Automation tables setup completed successfully!' as result;