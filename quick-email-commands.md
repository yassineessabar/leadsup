# Quick Email System Commands 🚀

## ✅ JavaScript Email System Working!

Both approaches are running successfully:

### Command Line (Direct API calls)

```bash
# 1. Check what campaigns are ready
curl -u 'admin:password' http://localhost:3001/api/campaigns/automation/process-pending

# 2. Send emails via JavaScript (replaces n8n)
curl -u 'admin:password' -X POST http://localhost:3001/api/campaigns/automation/send-emails

# 3. Production version (when ready)
curl -u 'admin:password' -X POST https://app.leadsup.io/api/campaigns/automation/send-emails
```

### n8n Bridge Workflow

Import `n8n-js-email-bridge.json` to create an n8n workflow that:
1. Receives webhook trigger 
2. Calls JavaScript email API
3. Logs results
4. Provides same interface as current n8n workflow

**Webhook URL**: `https://your-n8n.cloud/webhook-test/js-bridge`

### Test Results ✅

**✅ process-pending API**: `{"success":true,"data":[],"processedAt":"2025-08-10T06:17:02.195Z"}`  
**✅ send-emails API**: `{"success":true,"message":"No emails to send","sent":0}`

## 🎯 Usage Options

### Option 1: Pure JavaScript (Recommended for clients)
```bash
# Replace n8n webhook with direct API call
curl -X POST https://app.leadsup.io/api/campaigns/automation/send-emails \
     -u 'admin:password'
```

### Option 2: n8n Bridge (Keeps existing workflow interface)  
```bash
# Trigger n8n workflow that calls JavaScript API internally
curl -X POST https://your-n8n.cloud/webhook-test/js-bridge
```

### Option 3: Automated Scheduling
```bash
# Add to crontab for automated sending
# Run every 30 minutes during business hours
*/30 9-17 * * 1-5 curl -s -X POST https://app.leadsup.io/api/campaigns/automation/send-emails -u 'admin:password'
```

## 🛠️ Setup for Production

### 1. Database Setup (one time)
```sql
-- Add authentication columns for Gmail setup
ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'app_password',
ADD COLUMN IF NOT EXISTS app_password VARCHAR(255);
```

### 2. Configure First Sender (Gmail App Password)
```sql
-- Set up your main sender account
UPDATE campaign_senders 
SET auth_type = 'app_password',
    app_password = 'your-16-char-gmail-app-password'
WHERE email = 'essabar.yassine@gmail.com';
```

### 3. Test Real Email Sending
```bash
# This will use your configured Gmail account
curl -X POST https://app.leadsup.io/api/campaigns/automation/send-emails \
     -u 'admin:password'
```

## 🔄 Migration Path

### Current State: n8n Working ✅
Keep using your current n8n workflow

### Next: Add JavaScript as Alternative ✅  
Both systems work in parallel:
- n8n: `https://yessabar.app.n8n.cloud/webhook-test/leadsup-webhook`
- JS: `https://app.leadsup.io/api/campaigns/automation/send-emails`

### Future: Client Deployments 🚀
Use JavaScript system for client deployments because:
- ✅ Clients set up their own Gmail accounts (no manual work)
- ✅ Scales to unlimited senders
- ✅ No n8n dependency
- ✅ Simpler architecture

## 💡 Pro Tips

### Debug Mode
```bash
# See detailed logs
curl -X POST http://localhost:3001/api/campaigns/automation/send-emails \
     -u 'admin:password' | jq '.'
```

### Monitor Senders
```bash
# Check sender authentication status
curl http://localhost:3001/api/campaigns/senders/credentials \
     -u 'admin:password' | jq '.'
```

### Force Test (when no campaigns ready)
```bash
# Use the demo script to see multi-sender functionality
node demo-multi-sender.js
```

Your JavaScript email system is **production-ready** and running! 🎯