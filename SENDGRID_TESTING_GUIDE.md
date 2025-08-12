# 🧪 SendGrid Integration Testing Guide

## Overview
This guide will help you test that SendGrid is properly configured to send emails and capture replies in your LeadsUp application.

## Prerequisites
- SendGrid API Key configured in environment variables
- Next.js app running locally: `npm run dev`
- Database configured and accessible

## 📋 Testing Steps

### Step 1: Verify Webhook is Active

Run this to confirm the webhook endpoint is accessible:

```bash
# Test locally
curl http://localhost:3000/api/webhooks/sendgrid

# Test production (when deployed)
curl http://app.leadsup.io/api/webhooks/sendgrid
```

**Expected Response:**
```json
{
  "status": "SendGrid Inbound Parse webhook active",
  "endpoint": "/api/webhooks/sendgrid",
  "method": "POST",
  "provider": "SendGrid Inbound Parse"
}
```

### Step 2: Test Webhook with Simulated Data

This tests if the webhook can process incoming email data:

```bash
node test-webhook-direct.js
```

**What it does:**
- Simulates SendGrid sending an email to your webhook
- Tests form data parsing
- Verifies webhook response

**Expected Result:**
- Webhook should respond with 200 OK
- May show "Not a campaign email" (expected for test data)

### Step 3: Send a Real Test Email

Send an actual email that you can reply to:

```bash
node test-send-real-email.js your-email@example.com
```

**What happens:**
1. Sends email to your inbox via SendGrid
2. Email will have Reply-To: test@reply.leadsup.io
3. You can reply to test the full flow

**Important:** You need to verify your sender domain in SendGrid first!

### Step 4: Reply to the Test Email

1. Check your inbox for the test email
2. Click "Reply" 
3. Write any message
4. Send the reply

**The reply will:**
- Go to `test@reply.leadsup.io`
- Be captured by SendGrid Inbound Parse
- Be forwarded to your webhook
- Be stored in the database

### Step 5: Check if Reply was Captured

Wait 30-60 seconds, then check the database:

```bash
node check-inbox-replies.js
```

**What it checks:**
- Recent inbound messages in `inbox_messages` table
- Email threads in `inbox_threads` table
- Shows details of captured replies

## 🔄 Complete Campaign Email Flow Test

### 1. Create a Test Campaign
First, create a campaign in your app with:
- A test email sender (e.g., campaigns@leadsup.io)
- A test recipient

### 2. Send Campaign Email
Use the campaign automation to send an email:

```bash
# Trigger campaign email send
curl -X POST http://localhost:3000/api/campaigns/automation/send-emails \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
  -H "Content-Type: application/json"
```

### 3. Check Outbound Message
The sent email should appear in:
- `inbox_messages` table with `direction: 'outbound'`
- `folder: 'sent'`
- `provider: 'smtp'`

### 4. Reply to Campaign Email
When someone replies to the campaign email:
- Reply goes to your parse domain
- SendGrid captures and forwards to webhook
- Webhook stores in database

### 5. Verify Thread Continuity
Check that:
- Reply has same `conversation_id` as original
- Thread in `inbox_threads` is updated
- Message count increases

## 🛠️ Troubleshooting

### Webhook Not Receiving Data

**Check SendGrid Inbound Parse:**
1. Go to SendGrid Dashboard → Settings → Inbound Parse
2. Verify configuration:
   - Host: `reply.leadsup.io`
   - URL: `http://app.leadsup.io/api/webhooks/sendgrid`
   - POST the raw, full MIME message: OFF (unchecked)

**Check DNS MX Records:**
```bash
dig MX reply.leadsup.io
```

Should return:
```
reply.leadsup.io. 3600 IN MX 10 mx.sendgrid.net.
```

### Emails Not Sending

**Error: "The from address does not match a verified Sender Identity"**

Solution:
1. Go to SendGrid → Settings → Sender Authentication
2. Verify your domain (leadsup.io)
3. Or add single sender verification for testing

### Replies Not Captured

**Check SendGrid Activity:**
1. Go to SendGrid Dashboard → Activity Feed
2. Look for "Inbound Parse Webhook" events
3. Check if webhooks are being triggered

**Check Application Logs:**
```bash
# If using PM2
pm2 logs

# If using Docker
docker logs your-container-name

# Check Next.js console output
```

### Database Issues

**Verify Tables Exist:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('inbox_messages', 'inbox_threads');
```

**Check Recent Messages:**
```sql
-- Recent inbound messages
SELECT * FROM inbox_messages 
WHERE direction = 'inbound' 
ORDER BY created_at DESC 
LIMIT 10;

-- Recent threads
SELECT * FROM inbox_threads 
ORDER BY updated_at DESC 
LIMIT 10;
```

## 📊 What Success Looks Like

✅ **Outbound Email Success:**
- Email sent via SendGrid API
- Message stored in `inbox_messages` with `direction: 'outbound'`
- Thread created/updated in `inbox_threads`

✅ **Inbound Reply Success:**
- Reply captured by SendGrid Inbound Parse
- Webhook receives and processes data
- Message stored in `inbox_messages` with `direction: 'inbound'`
- Thread updated with latest message info
- Same `conversation_id` links messages together

## 🔍 Monitoring

### SendGrid Dashboard
- **Activity Feed**: Shows all email events
- **Inbound Parse**: Shows webhook calls
- **Stats**: Email delivery metrics

### Database Queries
```sql
-- Count messages by direction
SELECT direction, COUNT(*) 
FROM inbox_messages 
GROUP BY direction;

-- Recent webhook activity
SELECT created_at, contact_email, subject, provider 
FROM inbox_messages 
WHERE direction = 'inbound' 
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Application Logs
Look for these log messages:
- `📨 SendGrid Inbound Parse webhook received`
- `✅ Message stored successfully`
- `✅ Thread updated for conversation`

## 📝 Quick Test Checklist

- [ ] Webhook endpoint responds to GET request
- [ ] Webhook processes test POST data
- [ ] SendGrid can send emails (API key works)
- [ ] Sender domain is verified
- [ ] MX records configured for parse domain
- [ ] Inbound Parse webhook configured in SendGrid
- [ ] Database tables exist and are accessible
- [ ] Outbound emails are logged to database
- [ ] Inbound replies are captured and stored
- [ ] Email threading works (same conversation_id)

## 🚀 Production Deployment

Before going live:
1. Update webhook URL to production domain
2. Verify DNS records are propagated
3. Test with real email addresses
4. Monitor first few emails closely
5. Set up error alerting

---

**Need Help?**
- Check SendGrid logs: Dashboard → Activity Feed
- Check app logs: Server console or log files
- Check database: Recent messages and threads
- Review webhook response codes