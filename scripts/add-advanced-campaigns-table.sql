-- Create advanced_campaign_data table to store AI-generated campaign information
CREATE TABLE IF NOT EXISTS advanced_campaign_data (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    company_data JSONB NOT NULL,
    icp_data JSONB,
    persona_data JSONB,
    pain_point_data JSONB,
    outreach_strategy TEXT,
    completed_steps JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_advanced_campaign_data_campaign_id 
        FOREIGN KEY (campaign_id) 
        REFERENCES campaigns(id) 
        ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_advanced_campaign_data_campaign_id 
    ON advanced_campaign_data(campaign_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advanced_campaign_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_advanced_campaign_data_updated_at
    BEFORE UPDATE ON advanced_campaign_data
    FOR EACH ROW
    EXECUTE FUNCTION update_advanced_campaign_data_updated_at();