-- ============================================
-- MANUAL INBOX TABLES SETUP FOR SUPABASE
-- ============================================
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ajcubavmrrxzmonsdnsj
-- 2. Navigate to the SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "RUN" to execute
-- 
-- This will create all necessary tables for the inbox functionality
-- ============================================

-- Drop existing tables if they exist (clean slate)
DROP POLICY IF EXISTS "inbox_messages_user_policy" ON inbox_messages;
DROP POLICY IF EXISTS "inbox_threads_user_policy" ON inbox_threads;
DROP POLICY IF EXISTS "inbox_actions_user_policy" ON inbox_actions;
DROP POLICY IF EXISTS "inbox_folders_user_policy" ON inbox_folders;

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
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  message_type TEXT DEFAULT 'email' CHECK (message_type IN ('email', 'reply', 'forward')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('read', 'unread', 'archived', 'deleted')),
  folder TEXT DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'archived')),
  is_important BOOLEAN DEFAULT FALSE,
  lead_status TEXT CHECK (lead_status IN ('interested', 'meeting_booked', 'meeting_completed', 'won', 'lost')),
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  provider TEXT NOT NULL DEFAULT 'gmail' CHECK (provider IN ('gmail', 'outlook', 'smtp', 'sms')),
  provider_data JSONB DEFAULT '{}',
  has_attachments BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  in_reply_to TEXT,
  reference_ids TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, provider, user_id)
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  lead_status TEXT CHECK (lead_status IN ('interested', 'meeting_booked', 'meeting_completed', 'won', 'lost')),
  assigned_to UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- ============================================
-- CREATE INBOX_ACTIONS TABLE
-- ============================================
CREATE TABLE inbox_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID,
  action_type TEXT NOT NULL CHECK (action_type IN ('reply', 'forward', 'delete', 'archive', 'mark_read', 'mark_unread', 'move_folder', 'set_lead_status')),
  action_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id)
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
CREATE POLICY "inbox_messages_user_policy" ON inbox_messages
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbox_threads_user_policy" ON inbox_threads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbox_actions_user_policy" ON inbox_actions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "inbox_folders_user_policy" ON inbox_folders
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
-- inbox_messages indexes
CREATE INDEX IF NOT EXISTS idx_inbox_messages_user_id ON inbox_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_campaign_id ON inbox_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_sender_id ON inbox_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_contact_email ON inbox_messages(contact_email);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation_id ON inbox_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_direction ON inbox_messages(direction);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_status ON inbox_messages(status);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_folder ON inbox_messages(folder);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_sent_at ON inbox_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_received_at ON inbox_messages(received_at DESC);

-- inbox_threads indexes
CREATE INDEX IF NOT EXISTS idx_inbox_threads_user_id ON inbox_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_campaign_id ON inbox_threads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_contact_email ON inbox_threads(contact_email);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_conversation_id ON inbox_threads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_status ON inbox_threads(status);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_last_message_at ON inbox_threads(last_message_at DESC);

-- inbox_actions indexes
CREATE INDEX IF NOT EXISTS idx_inbox_actions_user_id ON inbox_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_actions_message_id ON inbox_actions(message_id);
CREATE INDEX IF NOT EXISTS idx_inbox_actions_action_type ON inbox_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_inbox_actions_status ON inbox_actions(status);

-- inbox_folders indexes
CREATE INDEX IF NOT EXISTS idx_inbox_folders_user_id ON inbox_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_folders_sort_order ON inbox_folders(sort_order);

-- ============================================
-- CREATE HELPER FUNCTIONS
-- ============================================
-- Function to generate conversation_id deterministically
CREATE OR REPLACE FUNCTION generate_conversation_id(
  contact_email_param TEXT,
  sender_email_param TEXT,
  campaign_id_param UUID DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
  -- Create deterministic conversation ID based on participants
  -- Sort emails to ensure consistent ID regardless of direction
  RETURN encode(
    digest(
      CASE 
        WHEN contact_email_param < sender_email_param 
        THEN contact_email_param || '|' || sender_email_param 
        ELSE sender_email_param || '|' || contact_email_param 
      END || COALESCE('|' || campaign_id_param::text, ''),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update thread statistics
CREATE OR REPLACE FUNCTION update_thread_stats(conversation_id_param TEXT)
RETURNS void AS $$
BEGIN
  UPDATE inbox_threads 
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM inbox_messages 
      WHERE conversation_id = conversation_id_param
        AND status != 'deleted'
    ),
    unread_count = (
      SELECT COUNT(*) 
      FROM inbox_messages 
      WHERE conversation_id = conversation_id_param
        AND status = 'unread'
        AND direction = 'inbound'
    ),
    last_message_at = (
      SELECT MAX(COALESCE(sent_at, received_at, created_at))
      FROM inbox_messages 
      WHERE conversation_id = conversation_id_param
        AND status != 'deleted'
    ),
    last_message_preview = (
      SELECT LEFT(COALESCE(body_text, subject, ''), 100)
      FROM inbox_messages 
      WHERE conversation_id = conversation_id_param
        AND status != 'deleted'
      ORDER BY COALESCE(sent_at, received_at, created_at) DESC 
      LIMIT 1
    ),
    updated_at = NOW()
  WHERE conversation_id = conversation_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================
-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER inbox_messages_updated_at 
  BEFORE UPDATE ON inbox_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inbox_threads_updated_at 
  BEFORE UPDATE ON inbox_threads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inbox_actions_updated_at 
  BEFORE UPDATE ON inbox_actions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inbox_folders_updated_at 
  BEFORE UPDATE ON inbox_folders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger to update thread stats when messages change
CREATE OR REPLACE FUNCTION trigger_update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_thread_stats(OLD.conversation_id);
    RETURN OLD;
  ELSE
    PERFORM update_thread_stats(NEW.conversation_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_stats_on_message_change
  AFTER INSERT OR UPDATE OR DELETE ON inbox_messages
  FOR EACH ROW EXECUTE FUNCTION trigger_update_thread_stats();

-- ============================================
-- VERIFICATION
-- ============================================
-- Verify tables were created
SELECT 'SUCCESS: All inbox tables created!' as status;

-- Show created tables
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('inbox_messages', 'inbox_threads', 'inbox_actions', 'inbox_folders')
  AND schemaname = 'public'
ORDER BY tablename;