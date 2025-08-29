# SendGrid Webhook Setup Guide

## Overview
This guide sets up real email tracking to get accurate health scores based on actual email performance instead of estimated values.

## Step 1: Create Database Tables

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Run this SQL to create the tracking tables:

```sql
-- Create SendGrid events tracking table
CREATE TABLE sendgrid_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  campaign_id TEXT,
  sg_message_id TEXT NOT NULL,
  sg_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'processed', 'delivered', 'deferred', 'bounce', 'blocked',
    'open', 'click', 'unsubscribe', 'group_unsubscribe', 'spam_report'
  )),
  email TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_sendgrid_events_email ON sendgrid_events(email);
CREATE INDEX idx_sendgrid_events_timestamp ON sendgrid_events(timestamp);
CREATE INDEX idx_sendgrid_events_event_type ON sendgrid_events(event_type);
CREATE INDEX idx_sendgrid_events_sender_email ON sendgrid_events((event_data->>'sender_email'));

-- Enable RLS
ALTER TABLE sendgrid_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage data
CREATE POLICY "Service role can manage sendgrid_events" ON sendgrid_events FOR ALL USING (true);
```

## Step 2: Configure SendGrid Webhook

1. Go to SendGrid Dashboard: https://app.sendgrid.com
2. Navigate to **Settings** → **Mail Settings** → **Event Webhooks**
3. Click **Create New Webhook**

### Webhook Configuration:
- **Webhook URL**: `https://app.leadsup.io/api/webhooks/sendgrid/events`
- **HTTP Method**: POST
- **Events to track**:
  - ✅ Processed
  - ✅ Delivered  
  - ✅ Bounce
  - ✅ Blocked
  - ✅ Open
  - ✅ Click
  - ✅ Unsubscribe
  - ✅ Group Unsubscribe
  - ✅ Spam Report

### Security (Optional):
- **Signed Webhook**: Enable for production
- **Public Key**: Add to your .env as `SENDGRID_WEBHOOK_PUBLIC_KEY`

## Step 3: Update Your Email Sending

When sending emails through SendGrid, include these custom arguments to track the sender:

```javascript
const msg = {
  to: 'recipient@example.com',
  from: 'contact@leadsup.io',
  subject: 'Your Subject',
  text: 'Email content',
  custom_args: {
    user_id: 'your-user-id',
    sender_email: 'contact@leadsup.io',
    campaign_id: 'your-campaign-id'
  }
}
```

## Step 4: Test the Integration

1. Send a test email through your system
2. Check webhook receives events: `curl https://app.leadsup.io/api/webhooks/sendgrid/events`
3. Verify events are stored: Check `sendgrid_events` table in Supabase
4. Test health score: `curl "https://app.leadsup.io/api/sender-accounts/health-score?emails=contact@leadsup.io"`

## Expected Results

After setup:
- **Real health scores** based on actual email performance
- **Accurate metrics**: Opens, clicks, bounces, deliverability rates
- **Historical tracking**: Build up performance data over time
- **Dynamic scoring**: Health scores update as email performance changes

## Troubleshooting

If you see errors:
1. Check webhook URL is accessible
2. Verify database tables were created
3. Ensure custom_args are included in emails
4. Check Supabase logs for webhook processing errors

## Current Status
- ✅ Webhook endpoint ready: `/api/webhooks/sendgrid/events`
- ✅ Database schema created
- ✅ Health calculation updated to use real data
- 🔄 **Next**: Run the SQL migration and configure SendGrid webhook