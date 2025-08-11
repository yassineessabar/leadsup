-- ============================================
-- SIMPLIFIED INBOX TABLES SETUP FOR SUPABASE
-- ============================================
-- Copy and paste this script into Supabase SQL Editor and run it
-- ============================================

-- Clean up existing tables
DROP TABLE IF EXISTS inbox_actions CASCADE;
DROP TABLE IF EXISTS inbox_folders CASCADE;
DROP TABLE IF EXISTS inbox_threads CASCADE;
DROP TABLE IF EXISTS inbox_messages CASCADE;

-- ============================================
-- CREATE INBOX_MESSAGES TABLE
-- ============================================
CREATE TABLE inbox_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  conversation_id TEXT NOT NULL,
  campaign_id UUID,
  sequence_id UUID,
  contact_id UUID,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  sender_id UUID,
  sender_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound',
  channel TEXT NOT NULL DEFAULT 'email',
  message_type TEXT DEFAULT 'email',
  status TEXT DEFAULT 'unread',
  folder TEXT DEFAULT 'inbox',
  is_important BOOLEAN DEFAULT FALSE,
  lead_status TEXT,
  lead_score INTEGER DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'gmail',
  provider_data JSONB DEFAULT '{}',
  has_attachments BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  in_reply_to TEXT,
  reference_ids TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INBOX_THREADS TABLE
-- ============================================
CREATE TABLE inbox_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  thread_id TEXT,
  campaign_id UUID,
  contact_id UUID,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  lead_status TEXT,
  assigned_to UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INBOX_ACTIONS TABLE
-- ============================================
CREATE TABLE inbox_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID,
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  synced_to_provider BOOLEAN DEFAULT FALSE,
  provider_response JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INBOX_FOLDERS TABLE
-- ============================================
CREATE TABLE inbox_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'folder',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_folders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================
CREATE POLICY "inbox_messages_policy" ON inbox_messages
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "inbox_threads_policy" ON inbox_threads
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "inbox_actions_policy" ON inbox_actions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "inbox_folders_policy" ON inbox_folders
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- CREATE ESSENTIAL INDEXES
-- ============================================
CREATE INDEX idx_inbox_messages_user_id ON inbox_messages(user_id);
CREATE INDEX idx_inbox_messages_conversation_id ON inbox_messages(conversation_id);
CREATE INDEX idx_inbox_messages_campaign_id ON inbox_messages(campaign_id);
CREATE INDEX idx_inbox_messages_status ON inbox_messages(status);
CREATE INDEX idx_inbox_messages_sent_at ON inbox_messages(sent_at DESC);

CREATE INDEX idx_inbox_threads_user_id ON inbox_threads(user_id);
CREATE INDEX idx_inbox_threads_conversation_id ON inbox_threads(conversation_id);
CREATE INDEX idx_inbox_threads_campaign_id ON inbox_threads(campaign_id);
CREATE INDEX idx_inbox_threads_last_message_at ON inbox_threads(last_message_at DESC);

CREATE INDEX idx_inbox_actions_user_id ON inbox_actions(user_id);
CREATE INDEX idx_inbox_actions_message_id ON inbox_actions(message_id);

CREATE INDEX idx_inbox_folders_user_id ON inbox_folders(user_id);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'SUCCESS: All inbox tables created successfully!' as result;

-- Show created tables
SELECT tablename, hasindexes, hasrules, hastriggers 
FROM pg_tables 
WHERE tablename LIKE 'inbox_%' 
  AND schemaname = 'public'
ORDER BY tablename;