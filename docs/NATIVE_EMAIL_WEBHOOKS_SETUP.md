# Native Email Webhook Integration Setup

## Overview

This guide sets up **native email capture** for both Gmail and SMTP providers, enabling real-time inbox functionality for your application.

## Architecture

```
📧 EMAIL FLOW:
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Gmail     │───▶│  Pub/Sub     │───▶│  Your App       │───▶│  Database    │
│   SMTP      │    │  Webhook     │    │  /api/webhooks/ │    │  inbox_*     │
│   Providers │    │  Forward     │    │                 │    │  tables      │
└─────────────┘    └──────────────┘    └─────────────────┘    └──────────────┘

📨 RESPONSE FLOW:
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│  Customer   │───▶│  Your App       │───▶│  Inbox UI    │───▶│  N8N         │
│  Replies    │    │  Real-time      │    │  Updates     │    │  Automation  │
│             │    │  Processing     │    │              │    │  Triggers    │
└─────────────┘    └─────────────────┘    └──────────────┘    └──────────────┘
```

## 🚀 Setup Steps

### 1. Database Setup

First, create the inbox tables:

```bash
# Run in Supabase SQL Editor
cat INBOX_TABLES_MANUAL_SETUP.sql
```

### 2. Environment Variables

Add these to your `.env.local`:

```bash
# Gmail API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Webhook Security
SMTP_WEBHOOK_SECRET=your-super-secret-webhook-token
GMAIL_WEBHOOK_SECRET=your-gmail-webhook-secret

# N8N Integration (optional)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/prospect-replied
```

### 3. Gmail Pub/Sub Setup

#### A. Enable APIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable these APIs:
   - Gmail API
   - Cloud Pub/Sub API
   - Cloud Functions API (optional)

#### B. Create Pub/Sub Topic

```bash
# Create topic
gcloud pubsub topics create gmail-webhooks

# Create subscription
gcloud pubsub subscriptions create gmail-webhook-subscription \
  --topic=gmail-webhooks \
  --push-endpoint=https://your-domain.com/api/webhooks/gmail
```

#### C. Configure Gmail Push Notifications

```bash
# For each Gmail account, set up push notifications
curl -X POST \
  "https://gmail.googleapis.com/gmail/v1/users/me/watch" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "projects/YOUR_PROJECT_ID/topics/gmail-webhooks",
    "labelIds": ["INBOX", "SENT"]
  }'
```

### 4. SMTP Webhook Setup

#### A. Email Forwarding Method

Set up email forwarding rules in your email provider:

**Gmail:**
1. Go to Settings > Forwarding and POP/IMAP
2. Add forwarding address: `webhook@your-domain.com`
3. Set up filter to forward all emails to webhook

**Outlook/Office365:**
1. Go to Rules & Alerts
2. Create rule to forward emails to webhook endpoint

#### B. SendGrid/Mailgun Integration

**SendGrid:**
```javascript
// SendGrid webhook endpoint format
POST /api/webhooks/smtp
Authorization: Bearer your-webhook-secret
Content-Type: application/json

{
  "from": "customer@example.com",
  "to": "your-sender@domain.com", 
  "subject": "Re: Your email",
  "textBody": "Thanks for reaching out!",
  "htmlBody": "<p>Thanks for reaching out!</p>",
  "messageId": "sendgrid-message-id",
  "date": "2024-01-01T12:00:00Z"
}
```

**Mailgun:**
```javascript
// Mailgun webhook endpoint format  
POST /api/webhooks/smtp
Authorization: Bearer your-webhook-secret
Content-Type: application/json

{
  "from": "customer@example.com",
  "to": "your-sender@domain.com",
  "subject": "Re: Your email", 
  "textBody": "Thanks for reaching out!",
  "htmlBody": "<p>Thanks for reaching out!</p>",
  "messageId": "mailgun-message-id",
  "date": "2024-01-01T12:00:00Z"
}
```

## 🔧 Webhook Endpoints

### Gmail Webhook: `/api/webhooks/gmail`

**Features:**
- ✅ Real-time Gmail push notifications
- ✅ OAuth2 authentication  
- ✅ Automatic conversation threading
- ✅ Campaign email detection
- ✅ Attachment handling

**Security:**
- Pub/Sub message verification
- Google OAuth token validation

### SMTP Webhook: `/api/webhooks/smtp`

**Features:**
- ✅ Universal SMTP provider support
- ✅ Email forwarding compatibility
- ✅ SendGrid/Mailgun integration
- ✅ Custom SMTP server support

**Security:**
- Bearer token authentication
- Request signature verification (optional)

## 📊 Testing

### 1. Test Email Sending + Inbox Logging

```bash
# Test campaign email sending with inbox integration
N8N_API_USERNAME=$N8N_API_USERNAME N8N_API_PASSWORD=$N8N_API_PASSWORD \
node scripts/test-inbox-functionality.js
```

### 2. Test Webhook Endpoints

```bash
# Test SMTP webhook
curl -X POST http://localhost:3000/api/webhooks/smtp \
  -H "Authorization: Bearer your-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "your-sender@domain.com",
    "subject": "Test Response",
    "textBody": "This is a test response",
    "messageId": "test-' $(date +%s) '"
  }'

# Test Gmail webhook (simulated)
curl -X POST http://localhost:3000/api/webhooks/gmail \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "data": "'$(echo '{"emailAddress":"your-email@gmail.com","historyId":"12345"}' | base64)'"
    }
  }'
```

### 3. End-to-End Test

1. **Send campaign email** using automation endpoint
2. **Check inbox UI** - email should appear in "Sent" folder  
3. **Reply from customer email** (or use webhook to simulate)
4. **Check inbox UI** - reply should appear threaded with original
5. **Verify N8N trigger** (if configured)

## 🔍 Debugging

### Check Webhook Logs

```bash
# View application logs
npm run dev

# Check webhook endpoint status
curl http://localhost:3000/api/webhooks/gmail
curl http://localhost:3000/api/webhooks/smtp
```

### Verify Database

```sql
-- Check if emails are being captured
SELECT 
  direction,
  contact_email,
  subject,
  sent_at,
  provider
FROM inbox_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- Check conversation threading
SELECT 
  conversation_id,
  count(*) as message_count,
  max(last_message_at) as latest_message
FROM inbox_threads 
GROUP BY conversation_id
ORDER BY latest_message DESC;
```

## 🚨 Troubleshooting

### Common Issues

**1. Gmail Webhook Not Receiving Events**
- Verify Pub/Sub topic exists
- Check push subscription endpoint URL
- Ensure Gmail watch is active (expires every 7 days)

**2. SMTP Webhook Authentication Failed**
- Verify `SMTP_WEBHOOK_SECRET` environment variable
- Check Authorization header format: `Bearer your-secret`

**3. Emails Not Threading Properly**
- Conversation ID generation issue
- Check `in_reply_to` and `references` headers
- Verify email addresses are normalized (lowercase)

**4. Database Foreign Key Errors**
- Run `ADD_FOREIGN_KEYS.sql` script
- Check inbox table relationships
- Verify user_id consistency

## 🔐 Security Best Practices

1. **Use HTTPS** for all webhook endpoints
2. **Verify webhook signatures** for production
3. **Rate limit** webhook endpoints
4. **Validate email headers** to prevent spoofing
5. **Sanitize email content** before storage
6. **Implement IP allowlisting** for known providers

## 📈 Monitoring

Track these metrics:
- Webhook response times
- Email processing success rate  
- Conversation threading accuracy
- Database query performance
- Failed webhook deliveries

## 🎯 Next Steps

1. **Set up Gmail Pub/Sub** for real-time capture
2. **Configure SMTP forwarding** for non-Gmail accounts  
3. **Test with actual campaign emails**
4. **Monitor webhook performance**
5. **Set up N8N automation triggers**

---

## Support

For issues with this setup:
1. Check the troubleshooting section above
2. Review application logs
3. Test webhook endpoints individually
4. Verify database table relationships