-- Create prospect_sequence_progress table for email tracking
CREATE TABLE IF NOT EXISTS public.prospect_sequence_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL,
    prospect_id UUID NOT NULL,
    sequence_id UUID NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_campaign_id ON public.prospect_sequence_progress(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_prospect_id ON public.prospect_sequence_progress(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_sequence_id ON public.prospect_sequence_progress(sequence_id);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_status ON public.prospect_sequence_progress(status);
CREATE INDEX IF NOT EXISTS idx_prospect_sequence_progress_sent_at ON public.prospect_sequence_progress(sent_at);

-- Create function to increment campaign sent count (if campaigns table exists)
CREATE OR REPLACE FUNCTION increment_campaign_sent_count(campaign_id_param UUID)
RETURNS void AS $$
BEGIN
    -- This function will silently fail if campaigns table doesn't exist
    BEGIN
        UPDATE campaigns 
        SET sent_count = COALESCE(sent_count, 0) + 1,
            updated_at = NOW()
        WHERE id = campaign_id_param;
    EXCEPTION
        WHEN undefined_table THEN
            -- Do nothing if campaigns table doesn't exist
            RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) if needed
ALTER TABLE public.prospect_sequence_progress ENABLE ROW LEVEL SECURITY;

-- Create a basic RLS policy (adjust based on your auth requirements)
CREATE POLICY "Allow all operations for authenticated users" ON public.prospect_sequence_progress
    FOR ALL USING (auth.role() = 'authenticated');