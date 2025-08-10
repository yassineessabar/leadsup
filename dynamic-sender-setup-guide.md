# Dynamic Multi-Sender Setup Guide 🚀
*Scalable solution for unlimited Gmail accounts*

## 🎯 Problem Solved
- **Static approach**: Hard-coding 10+ Gmail nodes = unmaintainable mess
- **Dynamic approach**: Single Gmail node + credential lookup = infinite scalability

## 🏗️ Architecture Overview

```
API assigns sender → Lookup n8n credential ID → Single dynamic Gmail node → Send email
```

### Key Components

1. **Database Mapping**: `campaign_senders` table stores n8n credential IDs
2. **Credential API**: Dynamic lookup endpoint for any sender email
3. **Single Gmail Node**: Uses dynamic credential assignment 
4. **Graceful Fallbacks**: Handles missing credentials elegantly

## 📋 Setup Steps

### Step 1: Database Migration
```sql
-- Run this to add credential mapping columns
\i add-n8n-credential-mapping.sql
```

### Step 2: Import Dynamic Workflow
1. In n8n, import `n8n-dynamic-sender-workflow.json`
2. This creates a single Gmail node with dynamic credential assignment

### Step 3: Create OAuth Credentials in n8n

For **each sender account** (can be 2, 10, or 100+ accounts):

1. In n8n: Settings → Credentials → Add New
2. Choose "Gmail OAuth2 API"
3. Name it: `Gmail {email}` (e.g., "Gmail anthoy2327")
4. Complete OAuth flow with that Gmail account
5. **Copy the credential ID** (looks like: `XyZ123AbC456`)

### Step 4: Map Credentials in Database

For each sender, add their n8n credential ID:

```sql
UPDATE campaign_senders 
SET n8n_credential_id = 'XyZ123AbC456',
    n8n_credential_name = 'Gmail anthoy2327@gmail.com'
WHERE email = 'anthoy2327@gmail.com';

UPDATE campaign_senders 
SET n8n_credential_id = 'AbC789DeF012',
    n8n_credential_name = 'Gmail ecomm2405@gmail.com'
WHERE email = 'ecomm2405@gmail.com';
```

## 🔄 How It Works

### Dynamic Credential Lookup Flow

1. **Email assigned**: API assigns `sender_email: "anthoy2327@gmail.com"`
2. **Credential lookup**: n8n calls `/api/campaigns/senders/credentials`
3. **Database query**: Finds `n8n_credential_id: "XyZ123AbC456"`
4. **Dynamic assignment**: Gmail node uses that credential ID
5. **Send email**: Email sent from correct Gmail account

### Error Handling

- **Missing credential**: Logs error, tracks as failed, continues with other emails
- **Invalid credential**: Gmail node fails gracefully, tracks failure
- **Account suspended**: Automatic error tracking and alerting

## 📊 Benefits vs Static Approach

| Feature | Static (Multiple Nodes) | Dynamic (Single Node) |
|---------|-------------------------|------------------------|
| **Scalability** | Max ~10 accounts | Unlimited accounts |
| **Maintenance** | N nodes × M changes | 1 node × 1 change |
| **Setup Time** | Hours per account | Minutes per account |
| **Error Handling** | Complex routing | Centralized logic |
| **Monitoring** | Multiple endpoints | Single flow |

## 🧪 Testing

### Test Credential Lookup
```bash
curl -u 'admin:password' \
  -H 'Content-Type: application/json' \
  -d '{"sender_email": "anthoy2327@gmail.com"}' \
  http://localhost:3001/api/campaigns/senders/credentials
```

### Test Email Flow
1. Trigger workflow: `curl -X POST 'https://yessabar.app.n8n.cloud/webhook-test/leadsup-webhook'`
2. Check logs for credential lookups
3. Verify emails sent from correct accounts
4. Check database tracking records

## 🔧 Adding New Sender Accounts

To add account #11, #50, or #100:

1. **Create OAuth credential** in n8n (2 minutes)
2. **Update database mapping** (1 SQL command)
3. **Done!** No workflow changes needed

```sql
-- Add sender #11
UPDATE campaign_senders 
SET n8n_credential_id = 'NEW_CREDENTIAL_ID',
    n8n_credential_name = 'Gmail newsender@gmail.com'
WHERE email = 'newsender@gmail.com';
```

## 🎛️ Management Commands

### List All Credential Mappings
```bash
curl -u 'admin:password' http://localhost:3001/api/campaigns/senders/credentials
```

### Check Missing Credentials
```sql
SELECT email, name, is_active,
  CASE 
    WHEN n8n_credential_id IS NULL THEN '❌ Setup Required'
    ELSE '✅ Ready'
  END as status
FROM campaign_senders 
WHERE is_active = true
ORDER BY n8n_credential_id IS NULL DESC, email;
```

## 🚨 Troubleshooting

### Email Not Sending From Correct Account
1. Check credential mapping: `SELECT email, n8n_credential_id FROM campaign_senders`
2. Verify n8n credential exists: n8n UI → Settings → Credentials
3. Check workflow logs for credential lookup errors

### "No credential found" Errors
1. Verify sender is active: `is_active = true`
2. Check credential ID exists in n8n
3. Ensure OAuth hasn't expired (n8n handles refresh automatically)

---

This dynamic solution scales from 1 to 1000+ sender accounts with zero workflow complexity! 🎯