# N8N Email Capture Setup - Complete Guide

## Overview
Since SendGrid signup is blocked, we'll use N8N as our email webhook receiver. N8N will:
1. Receive webhooks from ANY email provider (Gmail, Mailgun, custom SMTP)
2. Process the email data
3. Store in your Supabase database
4. Handle threading and badge counts

---

## Step 1: Install N8N

### Option A: Docker (Recommended)
```bash
# Create N8N with persistent data
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  --restart always \
  n8nio/n8n

# Access N8N at http://localhost:5678
```

### Option B: NPM Install
```bash
# Install globally
npm install n8n -g

# Start N8N
n8n start

# Access at http://localhost:5678
```

### Option C: N8N Cloud (Free tier available)
```
1. Go to: https://n8n.io/cloud/
2. Sign up for free account
3. Get your cloud instance URL
```

---

## Step 2: Configure Supabase Credentials in N8N

1. **Open N8N**: http://localhost:5678
2. **Go to Credentials** (left sidebar)
3. **Add New → Supabase**
4. **Enter your details**:
```
Host: https://ajcubavmrrxzmonsdnsj.supabase.co
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk
```
5. **Save**

---

## Step 3: Import Email Capture Workflow

### Copy this workflow JSON and import into N8N:

```json
{
  "name": "LeadsUp Email Capture",
  "nodes": [
    {
      "parameters": {
        "path": "email-webhook",
        "responseMode": "responseNode",
        "options": {
          "responseCode": 200
        }
      },
      "id": "webhook",
      "name": "Email Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "webhookId": "email-capture"
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "1",
              "name": "from_email",
              "value": "={{ $json.from?.toLowerCase() || $json.sender?.toLowerCase() || 'unknown@example.com' }}",
              "type": "string"
            },
            {
              "id": "2",
              "name": "to_email",
              "value": "={{ $json.to?.toLowerCase() || $json.recipient?.toLowerCase() || 'campaign@leadsup.com' }}",
              "type": "string"
            },
            {
              "id": "3",
              "name": "subject",
              "value": "={{ $json.subject || 'No Subject' }}",
              "type": "string"
            },
            {
              "id": "4",
              "name": "body_text",
              "value": "={{ $json.text || $json.body || $json.plain || '' }}",
              "type": "string"
            },
            {
              "id": "5",
              "name": "body_html",
              "value": "={{ $json.html || $json.body_html || '' }}",
              "type": "string"
            },
            {
              "id": "6",
              "name": "message_id",
              "value": "={{ 'n8n-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) }}",
              "type": "string"
            },
            {
              "id": "7",
              "name": "timestamp",
              "value": "={{ new Date().toISOString() }}",
              "type": "string"
            }
          ]
        }
      },
      "id": "extract",
      "name": "Extract Email Data",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [450, 300]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "=https://ajcubavmrrxzmonsdnsj.supabase.co/rest/v1/campaign_senders?email=eq.{{ $json.to_email }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk"
            },
            {
              "name": "Authorization",
              "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk"
            }
          ]
        }
      },
      "id": "find-sender",
      "name": "Find Campaign Sender",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [650, 300]
    },
    {
      "parameters": {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $json.length }}",
              "rightValue": 0,
              "operation": "larger"
            }
          ]
        }
      },
      "id": "check",
      "name": "Is Campaign Email?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [850, 300]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "1",
              "name": "user_id",
              "value": "={{ $json[0].user_id }}",
              "type": "string"
            },
            {
              "id": "2",
              "name": "campaign_id",
              "value": "={{ $json[0].campaign_id }}",
              "type": "string"
            },
            {
              "id": "3",
              "name": "conversation_id",
              "value": "={{ Buffer.from([$('Extract Email Data').item.json.from_email, $('Extract Email Data').item.json.to_email].sort().join('|')).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32) }}",
              "type": "string"
            }
          ]
        }
      },
      "id": "prepare",
      "name": "Prepare Message",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [1050, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://ajcubavmrrxzmonsdnsj.supabase.co/rest/v1/inbox_messages",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk"
            },
            {
              "name": "Authorization",
              "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Prefer",
              "value": "return=representation"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"user_id\": \"{{ $json.user_id }}\",\n  \"message_id\": \"{{ $('Extract Email Data').item.json.message_id }}\",\n  \"conversation_id\": \"{{ $json.conversation_id }}\",\n  \"campaign_id\": \"{{ $json.campaign_id }}\",\n  \"contact_email\": \"{{ $('Extract Email Data').item.json.from_email }}\",\n  \"sender_email\": \"{{ $('Extract Email Data').item.json.to_email }}\",\n  \"subject\": \"{{ $('Extract Email Data').item.json.subject }}\",\n  \"body_text\": \"{{ $('Extract Email Data').item.json.body_text }}\",\n  \"body_html\": \"{{ $('Extract Email Data').item.json.body_html }}\",\n  \"direction\": \"inbound\",\n  \"channel\": \"email\",\n  \"status\": \"unread\",\n  \"folder\": \"inbox\",\n  \"provider\": \"n8n\",\n  \"sent_at\": \"{{ $('Extract Email Data').item.json.timestamp }}\",\n  \"received_at\": \"{{ $('Extract Email Data').item.json.timestamp }}\"\n}"
      },
      "id": "store",
      "name": "Store in Inbox",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1250, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://ajcubavmrrxzmonsdnsj.supabase.co/rest/v1/inbox_threads",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk"
            },
            {
              "name": "Authorization",
              "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Prefer",
              "value": "resolution=merge-duplicates"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"user_id\": \"{{ $('Prepare Message').item.json.user_id }}\",\n  \"conversation_id\": \"{{ $('Prepare Message').item.json.conversation_id }}\",\n  \"campaign_id\": \"{{ $('Prepare Message').item.json.campaign_id }}\",\n  \"contact_email\": \"{{ $('Extract Email Data').item.json.from_email }}\",\n  \"subject\": \"{{ $('Extract Email Data').item.json.subject }}\",\n  \"last_message_at\": \"{{ $('Extract Email Data').item.json.timestamp }}\",\n  \"last_message_preview\": \"{{ $('Extract Email Data').item.json.body_text.substring(0, 150) }}\",\n  \"status\": \"active\"\n}"
      },
      "id": "thread",
      "name": "Update Thread",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1450, 200]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"success\": true,\n  \"message\": \"Email captured successfully\",\n  \"message_id\": \"{{ $('Extract Email Data').item.json.message_id }}\",\n  \"conversation_id\": \"{{ $('Prepare Message').item.json.conversation_id }}\",\n  \"timestamp\": \"{{ $('Extract Email Data').item.json.timestamp }}\"\n}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "success",
      "name": "Success Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1650, 200]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "{\n  \"success\": true,\n  \"message\": \"Not a campaign email, ignored\"\n}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "ignore",
      "name": "Ignore Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [1050, 400]
    }
  ],
  "connections": {
    "Email Webhook": {
      "main": [[{"node": "Extract Email Data", "type": "main", "index": 0}]]
    },
    "Extract Email Data": {
      "main": [[{"node": "Find Campaign Sender", "type": "main", "index": 0}]]
    },
    "Find Campaign Sender": {
      "main": [[{"node": "Is Campaign Email?", "type": "main", "index": 0}]]
    },
    "Is Campaign Email?": {
      "main": [
        [{"node": "Prepare Message", "type": "main", "index": 0}],
        [{"node": "Ignore Response", "type": "main", "index": 0}]
      ]
    },
    "Prepare Message": {
      "main": [[{"node": "Store in Inbox", "type": "main", "index": 0}]]
    },
    "Store in Inbox": {
      "main": [[{"node": "Update Thread", "type": "main", "index": 0}]]
    },
    "Update Thread": {
      "main": [[{"node": "Success Response", "type": "main", "index": 0}]]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1"
  }
}
```

### To Import:
1. Open N8N
2. Click **"+"** to create new workflow
3. Click **"⋮"** menu → **Import from File**
4. Paste the JSON above
5. Click **Import**
6. Click **Save**
7. Click **Active** toggle to activate

---

## Step 4: Get Your Webhook URL

After importing:
1. Click on **"Email Webhook"** node
2. Look for **"Production URL"** or **"Test URL"**
3. It will look like:
   - Local: `http://localhost:5678/webhook/email-webhook`
   - Cloud: `https://your-instance.n8n.cloud/webhook/email-webhook`

---

## Step 5: Test the Webhook

### Test with curl:
```bash
curl -X POST http://localhost:5678/webhook/email-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "essabar.yassine@gmail.com",
    "subject": "Test Email via N8N",
    "text": "This is a test email captured by N8N",
    "html": "<p>This is a <strong>test email</strong> captured by N8N</p>"
  }'
```

### Monitor results:
```bash
node scripts/monitor-real-response.js
```

---

## Step 6: Email Provider Options

### Option A: Gmail Forwarding (Free)
```
1. Gmail Settings → Forwarding
2. Add forwarding address: webhook@yourdomain.com
3. Set up email server to POST to N8N webhook
```

### Option B: Mailgun (1000 free/month)
```
1. Sign up at mailgun.com
2. Add domain and verify
3. Set up Routes:
   - Expression: match_recipient(".*@yourdomain.com")
   - Action: forward("YOUR_N8N_WEBHOOK_URL")
```

### Option C: Custom SMTP
```
1. Set up Postfix/Sendmail
2. Configure pipe to script
3. Script POSTs to N8N webhook
```

### Option D: Email Parser Service
```
1. Use Zapier Email Parser (free tier)
2. Forward emails to parser
3. Parser webhooks to N8N
```

---

## Step 7: Production Setup

### For Production:
1. **Use N8N Cloud** or deploy N8N on server
2. **Enable HTTPS** for webhook security
3. **Set up authentication** on N8N
4. **Configure error handling** workflow
5. **Set up monitoring** and alerts

### Environment Variables for N8N:
```bash
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure-password
N8N_WEBHOOK_BASE_URL=https://your-domain.com
N8N_ENCRYPTION_KEY=your-encryption-key
```

---

## Troubleshooting

### Webhook not receiving?
- Check N8N is running: `docker ps`
- Check webhook is active (toggle in workflow)
- Check firewall allows port 5678

### Emails not storing?
- Check Supabase credentials
- Check campaign_senders table has your email
- Check N8N execution logs

### Debug in N8N:
1. Click **Executions** in sidebar
2. See each webhook call
3. Click to see data at each step
4. Fix any red error nodes

---

## Success! 🎉

Your email capture is now working through N8N:
1. ✅ N8N receives webhooks
2. ✅ Processes email data
3. ✅ Stores in Supabase
4. ✅ Updates threads
5. ✅ Shows in LeadsUp inbox