-- Create inbox_emails table for LeadsUp inbox functionality
-- This table stores all email messages from campaign sequences

CREATE TABLE IF NOT EXISTS public.inbox_emails (
    id BIGSERIAL PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    preview TEXT,
    content TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    has_attachment BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    is_out_of_office BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'lead',
    status_label VARCHAR(255),
    to_email VARCHAR(255),
    from_email VARCHAR(255),
    is_primary BOOLEAN DEFAULT TRUE,
    folder VARCHAR(50) DEFAULT 'inbox',
    channel VARCHAR(20) DEFAULT 'email',
    
    -- Campaign context fields
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    sequence_step INTEGER,
    sequence_id UUID,
    
    -- Contact/Lead information
    contact_id UUID,
    contact_name VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User association
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS inbox_emails_user_id_idx ON public.inbox_emails(user_id);
CREATE INDEX IF NOT EXISTS inbox_emails_campaign_id_idx ON public.inbox_emails(campaign_id);
CREATE INDEX IF NOT EXISTS inbox_emails_status_idx ON public.inbox_emails(status);
CREATE INDEX IF NOT EXISTS inbox_emails_folder_idx ON public.inbox_emails(folder);
CREATE INDEX IF NOT EXISTS inbox_emails_is_read_idx ON public.inbox_emails(is_read);
CREATE INDEX IF NOT EXISTS inbox_emails_date_idx ON public.inbox_emails(date DESC);
CREATE INDEX IF NOT EXISTS inbox_emails_created_at_idx ON public.inbox_emails(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_inbox_emails_updated_at ON public.inbox_emails;
CREATE TRIGGER update_inbox_emails_updated_at 
    BEFORE UPDATE ON public.inbox_emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data to test the inbox functionality
INSERT INTO public.inbox_emails (
    user_id, sender, subject, preview, content, status, to_email, 
    campaign_id, sequence_step, is_read, folder, channel
) 
SELECT 
    u.id as user_id,
    'john.doe@example.com' as sender,
    'Re: Your proposal looks interesting' as subject,
    'Thanks for reaching out. I would love to schedule a call to discuss...' as preview,
    'Hi there,\n\nThanks for reaching out with your proposal. It looks very interesting and I would love to learn more.\n\nCould we schedule a 15-minute call sometime this week to discuss the details?\n\nBest regards,\nJohn Doe' as content,
    'interested' as status,
    'contact@leadsupbase.com' as to_email,
    c.id as campaign_id,
    2 as sequence_step,
    false as is_read,
    'inbox' as folder,
    'email' as channel
FROM auth.users u
LEFT JOIN public.campaigns c ON c.user_id = u.id
WHERE u.id IS NOT NULL
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.inbox_emails (
    user_id, sender, subject, preview, content, status, to_email, 
    campaign_id, sequence_step, is_read, folder, channel
)
SELECT 
    u.id as user_id,
    'sarah.wilson@company.com' as sender,
    'Meeting scheduled for next week' as subject,
    'Perfect! I have added the meeting to my calendar. Looking forward...' as preview,
    'Perfect!\n\nI have added the meeting to my calendar for Tuesday at 2 PM. Looking forward to discussing how we can work together.\n\nI will send you the Zoom link tomorrow.\n\nBest,\nSarah Wilson' as content,
    'meeting-booked' as status,
    'contact@leadsupbase.com' as to_email,
    c.id as campaign_id,
    3 as sequence_step,
    true as is_read,
    'inbox' as folder,
    'email' as channel
FROM auth.users u
LEFT JOIN public.campaigns c ON c.user_id = u.id
WHERE u.id IS NOT NULL
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.inbox_emails (
    user_id, sender, subject, preview, content, status, to_email, 
    campaign_id, sequence_step, is_read, folder, channel
)
SELECT 
    u.id as user_id,
    'mike.brown@business.co' as sender,
    'Follow-up on our conversation' as subject,
    'Hi, following up on our call yesterday. The pricing looks good...' as preview,
    'Hi,\n\nFollowing up on our call yesterday. The pricing looks good and the timeline works for us.\n\nLet me check with my team and I will get back to you by Friday.\n\nThanks!\nMike Brown' as content,
    'meeting-completed' as status,
    'contact@leadsupbase.com' as to_email,
    c.id as campaign_id,
    4 as sequence_step,
    false as is_read,
    'inbox' as folder,
    'email' as channel
FROM auth.users u
LEFT JOIN public.campaigns c ON c.user_id = u.id
WHERE u.id IS NOT NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add a sent message example
INSERT INTO public.inbox_emails (
    user_id, sender, subject, preview, content, status, to_email, 
    campaign_id, sequence_step, is_read, folder, channel
)
SELECT 
    u.id as user_id,
    'contact@leadsupbase.com' as sender,
    'Welcome to our service!' as subject,
    'Thank you for your interest in our solution. We are excited...' as preview,
    'Hello,\n\nThank you for your interest in our solution. We are excited to help you grow your business.\n\nI will reach out again in a few days to see if you have any questions.\n\nBest regards,\nLeadsUp Team' as content,
    'lead' as status,
    'prospect@example.com' as to_email,
    c.id as campaign_id,
    1 as sequence_step,
    true as is_read,
    'sent' as folder,
    'email' as channel
FROM auth.users u
LEFT JOIN public.campaigns c ON c.user_id = u.id
WHERE u.id IS NOT NULL
LIMIT 1
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.inbox_emails IS 'Stores all email messages from campaign sequences for the inbox functionality';
COMMENT ON COLUMN public.inbox_emails.campaign_id IS 'Links the message to a specific campaign';
COMMENT ON COLUMN public.inbox_emails.sequence_step IS 'Which step in the campaign sequence this message represents';
COMMENT ON COLUMN public.inbox_emails.folder IS 'Virtual folder: inbox, sent, drafts, scheduled, archived, spam, trash';
COMMENT ON COLUMN public.inbox_emails.channel IS 'Communication channel: email, sms';
COMMENT ON COLUMN public.inbox_emails.status IS 'Lead status: lead, interested, meeting-booked, meeting-completed, won, lost';