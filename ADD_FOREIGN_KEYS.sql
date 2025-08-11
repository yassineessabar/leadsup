-- ============================================
-- ADD FOREIGN KEY RELATIONSHIPS FOR INBOX TABLES
-- ============================================
-- Run this in Supabase SQL Editor after creating the basic tables
-- This fixes the relationship error between inbox_threads and inbox_messages
-- ============================================

-- Add foreign key constraints to establish relationships
-- Note: We can't use direct foreign keys because conversation_id is not unique
-- So we'll add indexes and let Supabase infer the relationship

-- Add unique constraint on conversation_id in inbox_threads (required for foreign key)
ALTER TABLE inbox_threads ADD CONSTRAINT unique_conversation_user UNIQUE (conversation_id, user_id);

-- Add foreign key relationship from inbox_messages to inbox_threads
-- This allows the API query to work with the !inner join
ALTER TABLE inbox_messages 
ADD CONSTRAINT fk_inbox_messages_conversation 
FOREIGN KEY (conversation_id, user_id) 
REFERENCES inbox_threads(conversation_id, user_id) 
ON DELETE CASCADE;

-- Add additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation_user ON inbox_messages(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread_relation ON inbox_messages(conversation_id) 
  WHERE conversation_id IS NOT NULL;

-- Verify the relationships were created
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('inbox_messages', 'inbox_threads', 'inbox_actions', 'inbox_folders')
ORDER BY tc.table_name;

-- Test query to make sure the relationship works
-- This should return results without errors
SELECT 
  t.*,
  (SELECT count(*) FROM inbox_messages m WHERE m.conversation_id = t.conversation_id AND m.user_id = t.user_id) as message_count_check
FROM inbox_threads t
LIMIT 1;

SELECT 'SUCCESS: Foreign key relationships added!' as result;