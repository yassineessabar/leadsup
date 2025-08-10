# 🚀 Complete Email Automation Testing Guide

## Prerequisites
1. **Log in to your application first** (required for Launch button)
2. **Open terminal** in your project directory

---

## STEP 1: Check Current Campaign Status

### 1.1 Check if campaigns exist
```bash
curl -s "http://localhost:3000/api/prospects" | jq '.prospects[] | {campaign_id, first_name, last_name}' | head -6
```

### 1.2 Find your campaign ID
```bash
curl -s "http://localhost:3000/api/prospects" | jq -r '.prospects[0].campaign_id // "No campaign found"'
```

### 1.3 Set campaign ID as variable (replace with your actual ID)
```bash
export CAMPAIGN_ID="e52a4ebf-73ea-44c8-b38d-30ee2b8108f6"
echo "Testing campaign: $CAMPAIGN_ID"
```

---

## STEP 2: Launch Campaign via UI

### 2.1 Manual step (do this in browser)
1. **Log in** to your application
2. Go to **Campaign Dashboard**
3. Click **Launch** button
4. Verify you see success toast

### 2.2 Verify launch worked (run after clicking Launch)
```bash
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | jq '.data | length'
```
**Expected**: Should return `1` (meaning 1 campaign ready)

---

## STEP 3: Test Automation Pipeline

### 3.1 Get full automation response
```bash
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | jq '.'
```

### 3.2 Check campaign details
```bash
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
  jq '.data[0] | {name, status, contacts: (.contacts | length), senders: (.senders | length)}'
```

### 3.3 Check contact details
```bash
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
  jq '.data[0].contacts[] | {firstName, lastName, email, sequence: .nextSequence.title}'
```

### 3.4 Check sender token status
```bash
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
  jq '.data[0].senders[] | {name, email, expires_at}'
```

---

## STEP 4: Test Email Sending

### 4.1 Run the email automation script
```bash
node email-sender.js
```

### 4.2 If tokens are invalid, test Gmail token validity
```bash
node test-gmail-tokens.js
```

---

## STEP 5: Check Results

### 5.1 Check if emails were marked as sent/failed in database
```bash
# This would require database access - check via your database tool
# or create an API endpoint to query contact_sequences table
```

### 5.2 Test automation again (should show fewer contacts if some were processed)
```bash
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
  jq '.data[0].contacts | length // 0'
```

---

## STEP 6: Debug Issues

### 6.1 If automation returns empty data
```bash
node complete-test-fix.js
```

### 6.2 If authentication fails
```bash
node test-auth-status.js
```

### 6.3 If tokens are invalid
```bash
node test-gmail-tokens.js
```

### 6.4 Check current prospects and their assignments
```bash
curl -s "http://localhost:3000/api/prospects" | jq '.prospects[] | {campaign_id, first_name, last_name, email_address}'
```

---

## STEP 7: Full Workflow Test

### 7.1 Run comprehensive test
```bash
node test-full-workflow.js
```

### 7.2 Run complete automation demo
```bash
node automation-demo.js
```

---

## Expected Results at Each Step

### ✅ STEP 1: Should show
- Campaign ID found
- 3 prospects assigned to campaign

### ✅ STEP 2: Should show
- Success toast in browser
- Automation returns 1 campaign ready

### ✅ STEP 3: Should show
```json
{
  "success": true,
  "data": [
    {
      "name": "Your Campaign Name",
      "status": "Active",
      "contacts": 3,
      "senders": 3
    }
  ]
}
```

### ✅ STEP 4: Should show
- Either successful email sending OR
- Token scope errors (need Gmail send permissions)

### ✅ STEP 5: Should show
- Database records updated
- Email status tracked

---

## Quick Troubleshooting Commands

### Check if campaign is active
```bash
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
  jq '.data | length'
```

### Check prospects count
```bash
curl -s "http://localhost:3000/api/prospects" | jq '.prospects | length'
```

### Test specific campaign ID
```bash
curl -s "http://localhost:3000/api/prospects?campaign_id=$CAMPAIGN_ID" | jq '.prospects | length'
```

### Check authentication status
```bash
curl -s "http://localhost:3000/api/auth/me" | jq '.success // false'
```

---

## Summary Commands (Run These in Order)

```bash
# 1. Set your campaign ID
export CAMPAIGN_ID="YOUR_CAMPAIGN_ID_HERE"

# 2. Test automation (after launching in UI)
curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | jq '.data | length'

# 3. Run email sender
node email-sender.js

# 4. Check Gmail tokens if needed
node test-gmail-tokens.js
```

**🎯 Goal**: After running these steps, you should have a fully functional email automation pipeline!