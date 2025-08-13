-- Fix thread message count to exclude trashed messages
-- This ensures the count matches what users see when they expand threads

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
        AND folder != 'trash'  -- Exclude messages moved to trash
    ),
    unread_count = (
      SELECT COUNT(*) 
      FROM inbox_messages 
      WHERE conversation_id = conversation_id_param
        AND status = 'unread'
        AND direction = 'inbound'
        AND folder != 'trash'  -- Exclude trashed messages from unread count too
    ),
    last_message_at = (
      SELECT MAX(COALESCE(sent_at, received_at, created_at))
      FROM inbox_messages 
      WHERE conversation_id = conversation_id_param
        AND status != 'deleted'
        AND folder != 'trash'  -- Use last message that's not trashed
    ),
    last_message_preview = (
      SELECT LEFT(COALESCE(body_text, subject, ''), 100)
      FROM inbox_messages 
      WHERE conversation_id = conversation_id_param
        AND status != 'deleted'
        AND folder != 'trash'  -- Use preview from non-trashed messages
      ORDER BY COALESCE(sent_at, received_at, created_at) DESC 
      LIMIT 1
    ),
    updated_at = NOW()
  WHERE conversation_id = conversation_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update all existing thread stats to fix current discrepancies
SELECT update_thread_stats(conversation_id) 
FROM inbox_threads 
WHERE message_count > 0;

-- Show some examples of the fixes
SELECT 
  conversation_id, 
  message_count, 
  (SELECT COUNT(*) FROM inbox_messages WHERE conversation_id = inbox_threads.conversation_id AND status != 'deleted') as total_messages,
  (SELECT COUNT(*) FROM inbox_messages WHERE conversation_id = inbox_threads.conversation_id AND status != 'deleted' AND folder != 'trash') as non_trash_messages
FROM inbox_threads 
WHERE message_count > 1 
LIMIT 5;