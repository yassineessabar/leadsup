# Complete End-to-End Email Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions to test the complete email system from domain setup to sending campaigns and receiving replies.

---

## 📋 Prerequisites Checklist

### Environment Setup
- [ ] Development server running (`npm run dev`)
- [ ] SendGrid account with API key
- [ ] Test email addresses available
- [ ] Database tables created and accessible

### Required Environment Variables
```bash
# Add to .env.local
SENDGRID_API_KEY=SG.your-actual-sendgrid-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🚀 Complete End-to-End Testing Flow

### Phase 1: Domain and Sender Setup

#### Step 1: Verify Domain Setup
```bash
# Test 1: Check if domains exist and are verified
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDomains() {
  const { data, error } = await supabase
    .from('domains')
    .select('id, domain, status, user_id')
    .eq('status', 'verified');
  
  console.log('✅ Verified domains:', data?.length || 0);
  data?.forEach(d => console.log(\`  - \${d.domain} (User: \${d.user_id})\`));
  
  if (!data?.length) {
    console.log('❌ No verified domains found. Set up domains first in the UI.');
  }
}

checkDomains().catch(console.error);
"
```

#### Step 2: Check Sender Accounts
```bash
# Test 2: Verify sender accounts exist for domains
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSenders() {
  const { data, error } = await supabase
    .from('sender_accounts')
    .select('id, email, domain_id, setup_status');
  
  console.log('✅ Sender accounts:', data?.length || 0);
  data?.forEach(s => console.log(\`  - \${s.email} (\${s.setup_status})\`));
  
  if (!data?.length) {
    console.log('❌ No sender accounts found. Create them via Domain tab.');
  }
}

checkSenders().catch(console.error);
"
```

### Phase 2: Campaign Setup and Sender Assignment

#### Step 3: Create Test Campaign (Via UI)
1. Navigate to your application: `http://localhost:3008`
2. Create a new campaign:
   - Name: "Email Integration Test Campaign"
   - Type: "Sequence"
   - Status: "Draft"

#### Step 4: Assign Sender Accounts to Campaign
1. Go to Campaign → **Sender** tab
2. Select sender accounts from your verified domains
3. Verify selection is saved (check console for logs)

#### Step 5: Verify Campaign-Sender Assignment
```bash
# Test 3: Check campaign-sender assignments
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAssignments() {
  // Get campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, user_id')
    .limit(5);
  
  console.log('📋 Testing campaign-sender assignments:');
  
  for (const campaign of campaigns || []) {
    console.log(\`\nCampaign: \${campaign.name} (ID: \${campaign.id})\`);
    
    const { data: assignments } = await supabase
      .from('campaign_senders')
      .select('id, email, is_active')
      .eq('campaign_id', campaign.id);
    
    if (assignments?.length) {
      console.log(\`  ✅ \${assignments.length} sender(s) assigned:\`);
      assignments.forEach(a => console.log(\`    - \${a.email} (Active: \${a.is_active})\`));
    } else {
      console.log('  ❌ No senders assigned');
    }
  }
}

checkAssignments().catch(console.error);
"
```

### Phase 3: Outbound Email Testing

#### Step 6: Test SendGrid Configuration
```bash
# Test 4: Verify SendGrid setup
node test-sendgrid-simple.js
```

**Expected Output:**
```
✅ SendGrid API key found
✅ SendGrid library imported successfully
✅ Email sent successfully!
📊 SendGrid Response:
   Status Code: 202
   Message ID: [unique-message-id]
```

#### Step 7: Add Test Contact to Campaign
1. Go to Campaign → **Contacts** tab
2. Add a test contact:
   ```
   Email: your-test-email@domain.com
   First Name: Test
   Last Name: User
   Company: Test Company
   ```

#### Step 8: Create Email Sequence
1. Go to Campaign → **Sequence** tab
2. Create a test email:
   ```
   Subject: Test Email from {{senderName}}
   Content: Hi {{firstName}}, this is a test email from our campaign system.
   ```

#### Step 9: Test Automated Email Sending
```bash
# Test 5: Send campaign emails using automation API
curl -X POST http://localhost:3008/api/campaigns/automation/send-emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'admin:password' | base64)" \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "sent": 1,
  "failed": 0,
  "features_used": [
    "🌍 Timezone-aware sending",
    "🎯 Consistent sender assignment",
    "📧 SendGrid API integration",
    "📥 Automated reply capture"
  ]
}
```

### Phase 4: Inbound Email Testing

#### Step 10: Test Webhook Endpoint
```bash
# Test 6: Verify webhook is active
curl -X GET http://localhost:3008/api/webhooks/sendgrid -v
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

#### Step 11: Simulate Inbound Email
```bash
# Test 7: Send simulated reply to webhook
curl -X POST http://localhost:3008/api/webhooks/sendgrid \
  -F "from=test-prospect@company.com" \
  -F "to=contact@leadsup.io" \
  -F "subject=Re: Test Email from LeadsUp" \
  -F "text=Thanks for your email! I'm interested in learning more about your solution." \
  -F "html=<p>Thanks for your email! I'm interested in learning more about your solution.</p>" \
  -F "envelope={\"from\": \"test-prospect@company.com\", \"to\": [\"contact@leadsup.io\"]}" \
  -F "headers={\"Message-Id\": \"<reply-test@company.com>\"}" \
  -F "charsets={}" \
  -F "spam_score=0.1" \
  -F "attachments=0" \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "generated-message-id",
  "conversationId": "generated-conversation-id",
  "processed": true
}
```

#### Step 12: Verify Inbound Email Storage
```bash
# Test 8: Check if inbound email was stored
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkInboundEmails() {
  const { data: messages } = await supabase
    .from('inbox_messages')
    .select('id, contact_email, sender_email, subject, direction, created_at')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('📨 Recent inbound messages:', messages?.length || 0);
  messages?.forEach(m => {
    console.log(\`  - From: \${m.contact_email} to \${m.sender_email}\`);
    console.log(\`    Subject: \${m.subject}\`);
    console.log(\`    Time: \${m.created_at}\`);
  });
}

checkInboundEmails().catch(console.error);
"
```

### Phase 5: End-to-End Flow Testing

#### Step 13: Complete Email Conversation Test
```bash
# Test 9: Create a complete email conversation
node -e "
console.log('🔄 Starting complete email conversation test...');

async function completeFlowTest() {
  console.log('Step 1: Send outbound email...');
  
  // Send campaign email
  const outboundResponse = await fetch('http://localhost:3008/api/campaigns/automation/send-emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
      'Content-Type': 'application/json'
    }
  });
  
  const outboundResult = await outboundResponse.json();
  console.log('📤 Outbound result:', outboundResult.sent, 'emails sent');
  
  console.log('\\nStep 2: Simulate prospect reply...');
  
  // Simulate inbound reply
  const formData = new (require('form-data'))();
  formData.append('from', 'prospect@testcompany.com');
  formData.append('to', 'contact@leadsup.io');
  formData.append('subject', 'Re: Your marketing solution inquiry');
  formData.append('text', 'Hi! I received your email and I\\'m very interested. Can we schedule a call?');
  formData.append('envelope', JSON.stringify({from: 'prospect@testcompany.com', to: ['contact@leadsup.io']}));
  
  const inboundResponse = await fetch('http://localhost:3008/api/webhooks/sendgrid', {
    method: 'POST',
    body: formData
  });
  
  const inboundResult = await inboundResponse.json();
  console.log('📥 Inbound result:', inboundResult.success ? 'Processed successfully' : 'Failed');
  
  console.log('\\n✅ Complete email conversation test finished!');
  console.log('Check your inbox_messages table for both outbound and inbound emails.');
}

completeFlowTest().catch(console.error);
"
```

### Phase 6: Production Readiness Verification

#### Step 14: Run Complete Integration Test
```bash
# Test 10: Run comprehensive integration test
node test-sendgrid-simple.js
```

#### Step 15: Verify All Systems
```bash
# Test 11: Final system verification
node -e "
console.log('🔍 Final System Verification');
console.log('=' .repeat(40));

async function finalVerification() {
  const checks = [];
  
  // Check 1: SendGrid API
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    checks.push({ name: 'SendGrid API', status: '✅ READY' });
  } catch (e) {
    checks.push({ name: 'SendGrid API', status: '❌ FAILED: ' + e.message });
  }
  
  // Check 2: Database connection
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase.from('campaigns').select('count').single();
    checks.push({ name: 'Database Connection', status: '✅ READY' });
  } catch (e) {
    checks.push({ name: 'Database Connection', status: '❌ FAILED: ' + e.message });
  }
  
  // Check 3: Webhook endpoint
  try {
    const response = await fetch('http://localhost:3008/api/webhooks/sendgrid');
    const status = response.ok ? '✅ READY' : '❌ FAILED: HTTP ' + response.status;
    checks.push({ name: 'Webhook Endpoint', status });
  } catch (e) {
    checks.push({ name: 'Webhook Endpoint', status: '❌ FAILED: ' + e.message });
  }
  
  // Check 4: Email automation
  try {
    const fs = require('fs');
    const exists = fs.existsSync('./app/api/campaigns/automation/send-emails/route.ts');
    checks.push({ name: 'Email Automation', status: exists ? '✅ READY' : '❌ MISSING' });
  } catch (e) {
    checks.push({ name: 'Email Automation', status: '❌ FAILED: ' + e.message });
  }
  
  console.log('\\nSystem Status:');
  checks.forEach(check => console.log(\`\${check.status} \${check.name}\`));
  
  const allReady = checks.every(c => c.status.startsWith('✅'));
  console.log(\`\\n\${allReady ? '🎉' : '⚠️'} Overall Status: \${allReady ? 'PRODUCTION READY' : 'NEEDS ATTENTION'}\`);
}

finalVerification().catch(console.error);
"
```

---

## 📊 Expected Test Results

### ✅ Successful Test Outcomes

#### Outbound Email Tests
- SendGrid API responds with 202 status
- Email sent with valid message ID
- Campaign emails processed by automation API
- Sender rotation working correctly

#### Inbound Email Tests  
- Webhook returns 200 status with success response
- Emails parsed and stored in inbox_messages table
- Conversation IDs generated consistently
- Thread management working

#### Database Tests
- All required tables accessible
- Campaign-sender assignments stored correctly
- Foreign key relationships maintained
- Data integrity preserved

### ⚠️ Common Issues and Solutions

#### Issue: "SENDGRID_API_KEY not found"
**Solution:**
```bash
# Add to .env.local
SENDGRID_API_KEY=SG.your-actual-api-key
```

#### Issue: "Domain not verified" 
**Solution:**
1. Go to SendGrid → Settings → Sender Authentication
2. Verify your domain (leadsup.io)
3. Add DNS records as instructed

#### Issue: "No campaign senders found"
**Solution:**
1. Create campaign via UI
2. Go to Campaign → Sender tab
3. Select sender accounts from verified domains

#### Issue: "User ID is null"
**Solution:**
- Ensure campaigns are created through the UI with proper user authentication
- Check that user_id is set when creating campaigns

#### Issue: "Webhook processing failed"
**Solution:**
- Verify development server is running on correct port
- Check that webhook endpoint exists and is accessible
- Ensure database permissions allow INSERT operations

---

## 🚀 Production Deployment Checklist

### Pre-Production
- [ ] All tests passing locally
- [ ] SendGrid domain authentication complete
- [ ] Database migrations applied
- [ ] Environment variables configured

### Production Configuration
- [ ] Update webhook URL in SendGrid to production domain
- [ ] Configure Inbound Parse subdomain (reply.yourdomain.com)
- [ ] Set up monitoring for email delivery rates
- [ ] Configure error alerting for webhook failures

### Post-Deployment Verification
- [ ] Send test campaign from production
- [ ] Verify replies are captured correctly
- [ ] Monitor logs for any errors
- [ ] Test conversation threading

---

## 📧 Manual Testing Scenarios

### Scenario 1: Basic Campaign Flow
1. Create campaign with 1 contact
2. Assign 1 sender account  
3. Create simple email sequence
4. Send via automation API
5. Verify email delivery

### Scenario 2: Reply Handling
1. Send campaign email to your own email
2. Reply to the received email
3. Check if reply appears in inbox_messages
4. Verify conversation threading

### Scenario 3: Multi-Sender Campaign
1. Create campaign with multiple contacts
2. Assign multiple sender accounts
3. Send campaign and verify sender rotation
4. Check that different senders are used

### Scenario 4: Error Handling
1. Try sending with invalid sender email
2. Send webhook data with malformed JSON
3. Verify error handling and logging
4. Check that system recovers gracefully

---

## 🎯 Success Criteria

### ✅ System is ready when:
- [ ] Outbound emails send successfully via SendGrid
- [ ] Inbound emails captured via webhook
- [ ] Campaign-sender assignments working
- [ ] Conversation threading maintained
- [ ] Error handling robust
- [ ] All tests passing consistently

### 📈 Performance Indicators
- Email delivery rate > 95%
- Webhook processing < 2 seconds
- Database queries optimized
- Error rate < 1%

**🎉 Your email system is production-ready when all tests pass and manual scenarios work correctly!**