-- Create prospect_sequence_progress table for email tracking (flexible ID format)
CREATE TABLE IF NOT EXISTS public.prospect_sequence_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,  -- Changed from UUID to VARCHAR
    prospect_id VARCHAR(255) NOT NULL,  -- Changed from UUID to VARCHAR  
    sequence_id VARCHAR(255) NOT NULL,  -- Changed from UUID to VARCHAR
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    message_id VARCHAR(255),
    error_message TEXT,
    sender_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Create unique constraint to prevent duplicates
    UNIQUE(campaign_id, prospect_id, sequence_id)
);

-- Drop existing table and recreate with flexible format
DROP TABLE IF EXISTS public.prospect_sequence_progress;

-- Recreate with flexible ID format
CREATE TABLE public.prospect_sequence_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    prospect_id VARCHAR(255) NOT NULL,
    sequence_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    message_id VARCHAR(255),
    error_message TEXT,
    sender_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(campaign_id, prospect_id, sequence_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_campaign_id ON public.prospect_sequence_progress(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_prospect_id ON public.prospect_sequence_progress(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_sequence_id ON public.prospect_sequence_progress(sequence_id);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_status ON public.prospect_sequence_progress(status);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_sent_at ON public.prospect_sequence_progress(sent_at);

-- Update the campaign stats function to work with VARCHAR IDs
CREATE OR REPLACE FUNCTION increment_campaign_sent_count(campaign_id_param VARCHAR)
RETURNS void AS $$
BEGIN
    BEGIN
        UPDATE campaigns 
        SET sent_count = COALESCE(sent_count, 0) + 1,
            updated_at = NOW()
        WHERE id::text = campaign_id_param OR id = campaign_id_param::uuid;
    EXCEPTION
        WHEN undefined_table THEN
            RETURN;
        WHEN invalid_text_representation THEN
            -- If campaign_id_param is not a valid UUID, try as string
            UPDATE campaigns 
            SET sent_count = COALESCE(sent_count, 0) + 1,
                updated_at = NOW()
            WHERE id::text = campaign_id_param;
            RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE public.prospect_sequence_progress ENABLE ROW LEVEL SECURITY;

-- Create a basic RLS policy
CREATE POLICY "Allow all operations for authenticated users" ON public.prospect_sequence_progress
    FOR ALL USING (auth.role() = 'authenticated');