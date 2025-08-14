-- Create profiles table for LinkedIn profile data
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    linkedin_url TEXT NOT NULL,
    name TEXT,
    title TEXT,
    company TEXT,
    location TEXT,
    profile_image_url TEXT,
    is_enriched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_profiles_campaign_id 
        FOREIGN KEY (campaign_id) 
        REFERENCES campaigns(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate profiles per campaign
    UNIQUE(campaign_id, linkedin_url)
);

-- Create contacts table for enriched profile data
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    profile_id UUID,
    
    -- Contact information
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    title TEXT,
    company TEXT,
    website TEXT,
    location TEXT,
    avatar_url TEXT,
    linkedin_url TEXT,
    
    -- Metadata
    source TEXT DEFAULT 'finalscout',
    confidence_score INTEGER,
    enriched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_contacts_campaign_id 
        FOREIGN KEY (campaign_id) 
        REFERENCES campaigns(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_contacts_profile_id 
        FOREIGN KEY (profile_id) 
        REFERENCES profiles(id) 
        ON DELETE SET NULL,
    
    -- Composite uniqueness on user_id, campaign_id, email
    UNIQUE(user_id, campaign_id, email)
);

-- Add scraping status columns to campaigns table
DO $$ 
BEGIN
    -- Add scraping_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'scraping_status'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN scraping_status TEXT DEFAULT 'idle' 
        CHECK (scraping_status IN ('idle', 'running', 'completed', 'failed'));
    END IF;

    -- Add scraping_progress column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'scraping_progress'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN scraping_progress JSONB DEFAULT '{"profiles_found": 0, "emails_found": 0, "current_step": "idle"}';
    END IF;

    -- Add industry, keyword, location columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'industry'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN industry TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'keyword'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN keyword TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'location'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN location TEXT;
    END IF;

    -- Add scraping_started_at and scraping_completed_at columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'scraping_started_at'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN scraping_started_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'scraping_completed_at'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN scraping_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_campaign_id ON profiles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_enriched ON profiles(is_enriched);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_contacts_campaign_id ON contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_profile_id ON contacts(profile_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

CREATE INDEX IF NOT EXISTS idx_campaigns_scraping_status ON campaigns(scraping_status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
CREATE POLICY "Users can view own profiles" ON profiles
    FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for contacts  
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
CREATE POLICY "Users can view own contacts" ON contacts
    FOR ALL USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create background jobs table for managing scraping tasks
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('find_profiles', 'get_emails')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_scraping_jobs_campaign_id 
        FOREIGN KEY (campaign_id) 
        REFERENCES campaigns(id) 
        ON DELETE CASCADE
);

-- Create indexes for scraping_jobs
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_campaign_id ON scraping_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_user_id ON scraping_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_job_type ON scraping_jobs(job_type);

-- Enable RLS for scraping_jobs
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for scraping_jobs
DROP POLICY IF EXISTS "Users can view own scraping jobs" ON scraping_jobs;
CREATE POLICY "Users can view own scraping jobs" ON scraping_jobs
    FOR ALL USING (user_id = auth.uid());

-- Create trigger for scraping_jobs updated_at
DROP TRIGGER IF EXISTS update_scraping_jobs_updated_at ON scraping_jobs;
CREATE TRIGGER update_scraping_jobs_updated_at 
    BEFORE UPDATE ON scraping_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE profiles IS 'LinkedIn profiles discovered by find_profiles.py';
COMMENT ON TABLE contacts IS 'Enriched contact information from FinalScout via get_emails.py';
COMMENT ON TABLE scraping_jobs IS 'Background jobs for managing LinkedIn scraping tasks';