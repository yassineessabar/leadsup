-- Add target_industry and target_location fields to campaigns table
-- These fields store the user-selected Target Audience data from the campaign creation modal

ALTER TABLE campaigns 
ADD COLUMN target_industry TEXT,
ADD COLUMN target_location TEXT;

-- Add comments to clarify the purpose
COMMENT ON COLUMN campaigns.target_industry IS 'User-selected target industries from Target Audience tab (comma-separated)';
COMMENT ON COLUMN campaigns.target_location IS 'User-selected target locations from Target Audience tab (comma-separated)';