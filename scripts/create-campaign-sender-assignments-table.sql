-- Create campaign_sender_assignments table
CREATE TABLE IF NOT EXISTS campaign_sender_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  sender_account_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_campaign_sender_assignments_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_campaign_sender_assignments_sender
    FOREIGN KEY (sender_account_id) REFERENCES sender_accounts(id) ON DELETE CASCADE,
    
  -- Unique constraint to prevent duplicate assignments
  CONSTRAINT uk_campaign_sender_assignment 
    UNIQUE (campaign_id, sender_account_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_sender_assignments_campaign_id 
  ON campaign_sender_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sender_assignments_sender_id 
  ON campaign_sender_assignments(sender_account_id);

-- Set up Row Level Security (RLS)
ALTER TABLE campaign_sender_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (users can only access assignments for their own campaigns)
CREATE POLICY campaign_sender_assignments_user_policy ON campaign_sender_assignments
  FOR ALL 
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_sender_assignments_updated_at 
  BEFORE UPDATE ON campaign_sender_assignments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();