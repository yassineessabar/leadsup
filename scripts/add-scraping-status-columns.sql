-- Add scraping status columns to campaigns table if they don't exist
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS scraping_status TEXT DEFAULT 'idle' CHECK (scraping_status IN ('idle', 'running', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS scraping_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_campaigns_scraping_status ON campaigns(scraping_status);

-- Update RLS policies to allow users to see and update their own campaign's scraping status
CREATE POLICY "Users can update scraping status for their campaigns" 
ON campaigns 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());