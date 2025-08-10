# Inbox Integration Documentation

This document describes the comprehensive inbox integration for LeadsUp, supporting message management, threading, filtering, and actions for email sequences and campaigns.

## Overview

The inbox integration provides:

- **Message Management**: View, organize, and manage all messages from sequences/campaigns
- **Threading**: Automatic conversation threading by deterministic conversation_id
- **Filtering**: Advanced filtering by campaign, sender, lead status, folder, channel, date range, and search
- **Actions**: Reply, forward, delete (soft), mark read/unread, move folder, archive, set lead status
- **Performance**: Sub-500ms queries via optimized indexes and pagination
- **Security**: User-level RLS policies and authentication

## Scope

The inbox lists **only messages sent/received by sender accounts attached to at least one sequence** AND that can be associated to a **campaign/sequence/thread we own**.

## Database Schema

### Core Tables

#### `inbox_messages`
Main message storage with full provider and campaign context.

```sql
- id (UUID, Primary Key)
- message_id (TEXT) - Provider-specific message ID
- thread_id (TEXT) - Provider thread ID
- conversation_id (TEXT) - Internal deterministic conversation ID
- campaign_id (UUID) - Associated campaign
- sequence_id (UUID) - Associated sequence step
- contact_id (UUID) - Contact/Lead reference
- contact_email (TEXT) - Contact email
- contact_name (TEXT) - Contact name
- sender_id (UUID) - Sender account reference
- sender_email (TEXT) - Sender email
- subject (TEXT) - Message subject
- body_text (TEXT) - Plain text body
- body_html (TEXT) - HTML body
- direction (TEXT) - 'inbound' or 'outbound'
- channel (TEXT) - 'email' (SMS future)
- status (TEXT) - 'read', 'unread', 'archived', 'deleted'
- folder (TEXT) - 'inbox', 'sent', 'drafts', 'trash', 'archived'
- lead_status (TEXT) - 'interested', 'meeting_booked', 'meeting_completed', 'won', 'lost'
- provider (TEXT) - 'gmail', 'outlook', 'smtp'
- provider_data (JSONB) - Provider-specific metadata
- has_attachments (BOOLEAN)
- attachments (JSONB) - Attachment metadata
- sent_at (TIMESTAMP)
- received_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID) - For RLS
```

#### `inbox_threads`
Conversation thread management and statistics.

```sql
- id (UUID, Primary Key)
- conversation_id (TEXT) - Matches inbox_messages
- thread_id (TEXT) - Provider thread ID if available
- campaign_id (UUID) - Associated campaign
- contact_id (UUID) - Contact reference
- contact_email (TEXT)
- contact_name (TEXT)
- subject (TEXT) - Thread subject
- last_message_at (TIMESTAMP)
- last_message_preview (TEXT)
- message_count (INTEGER)
- unread_count (INTEGER)
- status (TEXT) - 'active', 'closed', 'archived'
- lead_status (TEXT) - Thread-level lead status
- assigned_to (UUID) - User assignment
- tags (TEXT[]) - Thread tags
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID) - For RLS
```

#### `inbox_actions`
Action history and audit trail.

```sql
- id (UUID, Primary Key)
- message_id (UUID) - Reference to inbox_messages
- action_type (TEXT) - 'reply', 'forward', 'delete', 'archive', 'mark_read', 'mark_unread', 'move_folder', 'set_lead_status'
- action_data (JSONB) - Action-specific data
- status (TEXT) - 'pending', 'completed', 'failed'
- error_message (TEXT)
- synced_to_provider (BOOLEAN) - Provider sync status
- provider_response (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID) - For RLS
```

#### `inbox_folders`
Custom folder management.

```sql
- id (UUID, Primary Key)
- name (TEXT) - Folder name
- description (TEXT)
- color (TEXT) - Hex color
- icon (TEXT) - Icon identifier
- sort_order (INTEGER)
- is_system (BOOLEAN) - System vs custom folders
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- user_id (UUID) - For RLS
```

## API Endpoints

### Messages

#### `GET /api/inbox`
Fetch inbox messages with filtering and pagination.

**Query Parameters:**
- `view` - 'threads' or 'messages' (default: 'threads')
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `campaigns` - Comma-separated campaign IDs
- `senders` - Comma-separated sender IDs
- `lead_statuses` - Comma-separated lead statuses
- `folder` - Folder name (default: 'inbox')
- `channel` - Channel type (default: 'email')
- `status` - Message status ('read', 'unread', etc.)
- `search` - Search query (subject/body/contact)
- `date_from` - Start date (ISO string)
- `date_to` - End date (ISO string)

**Response:**
```json
{
  "success": true,
  "data": {
    "threads": [...] | "messages": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    }
  }
}
```

#### `POST /api/inbox`
Create a new message (usually from sequence responses).

**Body:**
```json
{
  "message_id": "provider_msg_123",
  "thread_id": "provider_thread_456",
  "campaign_id": "uuid",
  "sequence_id": "uuid",
  "contact_email": "contact@example.com",
  "contact_name": "John Doe",
  "sender_id": "uuid",
  "sender_email": "sender@company.com",
  "subject": "Message Subject",
  "body_text": "Plain text content",
  "body_html": "<p>HTML content</p>",
  "direction": "inbound",
  "channel": "email",
  "status": "unread",
  "provider": "gmail",
  "sent_at": "2024-01-01T12:00:00Z"
}
```

#### `GET /api/inbox/{id}`
Fetch specific message with conversation thread.

#### `PATCH /api/inbox/{id}`
Update message (mark read/unread, set lead status, move folder, etc.).

**Body:**
```json
{
  "status": "read",
  "folder": "important",
  "lead_status": "interested",
  "is_important": true
}
```

#### `DELETE /api/inbox/{id}`
Soft delete message (move to trash).

### Actions

#### `POST /api/inbox/actions`
Perform inbox actions on one or multiple messages.

**Body:**
```json
{
  "action": "reply",
  "message_id": "uuid",
  "data": {
    "subject": "Re: Subject",
    "body": "Reply content",
    "to_email": "contact@example.com"
  }
}
```

**Supported Actions:**
- `reply` - Reply to message
- `forward` - Forward message
- `archive` - Archive message
- `mark_read` - Mark as read
- `mark_unread` - Mark as unread
- `move_folder` - Move to folder
- `set_lead_status` - Set lead status
- `set_important` - Set important flag

### Folders

#### `GET /api/inbox/folders`
Fetch user's inbox folders with message counts.

#### `POST /api/inbox/folders`
Create a new custom folder.

#### `PUT /api/inbox/folders`
Update folder order.

### Statistics

#### `GET /api/inbox/stats`
Fetch inbox statistics and summary.

**Query Parameters:**
- `range` - Days to include (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_messages": 150,
      "unread_messages": 12,
      "today_messages": 5,
      "response_rate": 85,
      "avg_response_time": "2.5 hours"
    },
    "lead_status_breakdown": {
      "interested": 45,
      "meeting_booked": 12,
      "won": 8
    },
    "campaign_performance": {
      "Welcome Series": 67,
      "Follow-up Campaign": 23
    },
    "folder_distribution": {
      "inbox": 89,
      "important": 15,
      "archived": 46
    },
    "recent_activity": [...],
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z",
      "days": 30
    }
  }
}
```

## Threading System

Messages are automatically threaded using a deterministic `conversation_id` generated from:
- Contact email
- Sender email  
- Campaign ID (optional)

This ensures consistent threading regardless of provider thread IDs and works across different email providers.

**Generation Function:**
```sql
SELECT generate_conversation_id(
  'contact@example.com',
  'sender@company.com', 
  'campaign-uuid'
);
```

## Performance Optimizations

### Indexes
- Composite indexes for common query patterns
- Full-text search index for content search
- Optimized for sub-500ms query performance
- Proper pagination support

### Query Optimization
- Parallel queries for statistics
- Selective field fetching
- Efficient pagination with offset/limit
- Proper use of database joins

### Caching Strategy
- Thread statistics cached and updated via triggers
- Folder message counts updated in real-time
- Provider sync status cached

## Security

### Row Level Security (RLS)
All tables have RLS enabled with user-level policies:

```sql
CREATE POLICY "Users can manage their inbox messages" ON inbox_messages
  FOR ALL USING (user_id = auth.uid());
```

### Authentication
All endpoints require valid session authentication via `getUserIdFromSession()`.

### Data Access
- Users can only access their own messages
- Campaign association required for message visibility
- Sender account must be attached to user's sequences

## Integration with Email Providers

### Provider Sync
- Actions logged in `inbox_actions` for provider synchronization
- Provider-specific metadata stored in `provider_data` JSONB field
- Support for Gmail, Outlook, and SMTP providers

### Message Ingestion
Messages are created via:
1. Sequence email responses (automatic)
2. Provider webhooks/polling (future)
3. Manual API creation (testing/import)

## Setup Instructions

1. **Database Schema:**
   ```bash
   # Run in Supabase SQL Editor
   psql -f scripts/create-inbox-tables.sql
   ```

2. **Test Functionality:**
   ```bash
   # Configure session token in test script
   node scripts/test-inbox-functionality.js
   ```

3. **Frontend Integration:**
   ```javascript
   // Fetch inbox with filters
   const response = await fetch('/api/inbox?view=threads&campaigns=uuid1,uuid2&limit=20');
   
   // Perform action
   await fetch('/api/inbox/actions', {
     method: 'POST',
     body: JSON.stringify({
       action: 'reply',
       message_id: 'uuid',
       data: { subject: 'Re: Subject', body: 'Reply content' }
     })
   });
   ```

## Future Enhancements

### Provider Integration
- Real-time Gmail API sync
- Outlook/Exchange integration
- IMAP/POP3 support
- SMS provider integration

### Advanced Features
- AI-powered response suggestions
- Automated lead scoring
- Email templates
- Bulk operations
- Advanced analytics

### Performance
- Redis caching layer
- Background job processing
- Webhook-based real-time updates
- Message archiving strategy

## Troubleshooting

### Common Issues

1. **Messages not appearing:**
   - Check campaign/sender association
   - Verify RLS policies
   - Confirm user authentication

2. **Performance issues:**
   - Check index usage with EXPLAIN
   - Verify pagination parameters
   - Consider date range limitations

3. **Threading problems:**
   - Verify conversation_id generation
   - Check for consistent email normalization
   - Ensure provider thread_id mapping

### Debug Queries

```sql
-- Check message distribution
SELECT folder, status, COUNT(*) 
FROM inbox_messages 
WHERE user_id = 'user-uuid' 
GROUP BY folder, status;

-- Verify threading
SELECT conversation_id, COUNT(*), MAX(created_at)
FROM inbox_messages 
WHERE user_id = 'user-uuid'
GROUP BY conversation_id
ORDER BY COUNT(*) DESC;

-- Performance check
EXPLAIN ANALYZE SELECT * FROM inbox_messages 
WHERE user_id = 'user-uuid' 
  AND status = 'unread' 
  AND folder = 'inbox'
ORDER BY created_at DESC 
LIMIT 20;
```

## Support

For issues or questions about the inbox integration:

1. Check the test script output for API functionality
2. Review database logs for constraint violations
3. Verify campaign/sequence/sender relationships
4. Test with simplified queries first

The inbox integration is designed to scale with your sequence volume while maintaining sub-500ms response times and providing a comprehensive message management experience.