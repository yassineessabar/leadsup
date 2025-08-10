# Multi-Sender Gmail Authentication Setup Guide

## Problem Solved
The previous n8n workflow could only use one Gmail OAuth credential, so all emails were sent from `essabar.yassine@gmail.com` regardless of the API's sender rotation logic.

## Solution: Multiple Gmail Nodes with Switch Routing

The new workflow (`n8n-multi-sender-workflow.json`) implements:

### 1. Route by Sender Switch Node
- Routes emails to different Gmail nodes based on `sender_email`
- Supports 3 senders: essabar.yassine@gmail.com, anthoy2327@gmail.com, ecomm2405@gmail.com

### 2. Separate Gmail Nodes
- **Gmail Sender 1**: Uses existing `essabar.yassine@gmail.com` OAuth credential
- **Gmail Sender 2**: Needs new OAuth credential for `anthoy2327@gmail.com`  
- **Gmail Sender 3**: Needs new OAuth credential for `ecomm2405@gmail.com`

### 3. Unified Tracking
- Single success/failure tracking nodes handle all senders
- Logs include sender information for debugging

## Setup Steps

### Step 1: Import New Workflow
1. In n8n, go to Workflows → Import from JSON
2. Upload `n8n-multi-sender-workflow.json`
3. The workflow will be imported but credentials need setup

### Step 2: Create Gmail OAuth Credentials

For `anthoy2327@gmail.com`:
1. In n8n, go to Settings → Credentials → Add New
2. Select "Gmail OAuth2 API" 
3. Name it "Gmail anthoy2327"
4. Follow OAuth flow to authenticate with anthoy2327@gmail.com account
5. Note the credential ID and update the workflow

For `ecomm2405@gmail.com`:
1. Repeat above process for ecomm2405@gmail.com
2. Name it "Gmail ecomm2405"

### Step 3: Update Workflow Credentials
In the workflow, update these credential IDs:
- `Gmail Sender 2 (anthoy2327)` → Replace "NEED-TO-CREATE-2" with actual credential ID
- `Gmail Sender 3 (ecomm2405)` → Replace "NEED-TO-CREATE-3" with actual credential ID

## How It Works

1. **API assigns senders**: Your existing API correctly rotates between accounts
2. **Switch routes emails**: The "Route by Sender" node checks `sender_email` field
3. **Correct Gmail node**: Each email goes to the Gmail node with proper OAuth credential
4. **Success tracking**: Unified tracking works for all senders

## Benefits

✅ **True multi-account sending**: Each email sent from correct Gmail account
✅ **Proper OAuth security**: Each account uses its own OAuth credential  
✅ **Sender reputation**: Emails actually come from the assigned sender account
✅ **No SMTP complexity**: Stays with familiar Gmail OAuth instead of SMTP/App Passwords

## Testing

After setup, when you run the workflow:
- Emails assigned to `essabar.yassine@gmail.com` → Gmail Sender 1
- Emails assigned to `anthoy2327@gmail.com` → Gmail Sender 2  
- Emails assigned to `ecomm2405@gmail.com` → Gmail Sender 3

Check Gmail sent folders to verify emails are sent from correct accounts.

## Alternative: Quick Fix (Filter to Authenticated Senders Only)

If OAuth setup is complex, you can temporarily filter the API to only use senders with OAuth credentials:

```sql
-- Mark which senders have OAuth credentials in n8n
ALTER TABLE campaign_senders ADD COLUMN has_oauth_credential BOOLEAN DEFAULT false;

UPDATE campaign_senders 
SET has_oauth_credential = true 
WHERE email = 'essabar.yassine@gmail.com';

UPDATE campaign_senders 
SET has_oauth_credential = false 
WHERE email IN ('anthoy2327@gmail.com', 'ecomm2405@gmail.com');
```

Then modify the API query to only use authenticated senders:
```sql
WHERE cs.is_active = true AND cs.has_oauth_credential = true
```

This ensures only `essabar.yassine@gmail.com` is used until other OAuth credentials are setup.