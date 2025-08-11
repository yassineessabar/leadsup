#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLeadsUpDomain() {
  console.log('📧 MAILERSEND WITH APP.LEADSUP.IO DOMAIN');
  console.log('=======================================\n');
  
  const MAILERSEND_API_TOKEN = 'mlsn.8ac86c7240b7326eab5aee6037f008b63f431c7d87419bb73bae4751d88bbd10';
  const API_BASE = 'https://api.mailersend.com/v1';
  const YOUR_DOMAIN = 'app.leadsup.io';
  
  console.log(`🎯 Using your verified domain: ${YOUR_DOMAIN}`);
  console.log(`🔑 API Token: ${MAILERSEND_API_TOKEN.substring(0, 15)}...`);
  console.log('');
  
  // Test 1: Verify domain is configured
  console.log('🔍 Step 1: Checking domain configuration...');
  
  try {
    const domainsResponse = await fetch(`${API_BASE}/domains`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const domainsResult = await domainsResponse.json();
    
    if (domainsResponse.ok) {
      console.log('✅ API connection successful!');
      
      const leadsupDomain = domainsResult.data?.find(d => d.name === YOUR_DOMAIN);
      if (leadsupDomain) {
        console.log(`✅ Domain ${YOUR_DOMAIN} found in MailerSend`);
        console.log(`   Status: ${leadsupDomain.domain_settings?.send_paused ? '⏸️ Paused' : '✅ Active'}`);
        console.log(`   Verified: ${leadsupDomain.is_verified ? '✅ Yes' : '❌ No'}`);
      } else {
        console.log(`❌ Domain ${YOUR_DOMAIN} not found. Please add it to MailerSend first.`);
        return;
      }
    } else {
      console.log('❌ API connection failed:', domainsResult);
      return;
    }
    
  } catch (error) {
    console.error('❌ Domain check failed:', error.message);
    return;
  }
  
  // Test 2: Send email from your domain
  console.log('\n📤 Step 2: Sending test email from your domain...');
  
  const emailData = {
    from: {
      email: `campaign@${YOUR_DOMAIN}`,
      name: 'LeadsUp Campaign System'
    },
    to: [
      {
        email: 'essabar.yassine@gmail.com',
        name: 'Yassine Essabar'
      }
    ],
    subject: 'LeadsUp Campaign - Test Email Thread Capture System',
    text: `Hi Yassine!

This is a test email from your LeadsUp campaign system using your own domain: ${YOUR_DOMAIN}

🧪 TESTING INSTRUCTIONS:
========================
Please reply to this email from your Gmail account so we can test the complete email thread capture system.

When you reply:
1. Your response will be sent to: campaign@${YOUR_DOMAIN}
2. MailerSend will forward it to: http://app.leadsup.io/api/webhooks/mailersend
3. Our webhook will capture and store it in the inbox_messages table
4. A conversation thread will be created for proper email threading
5. You'll be able to see it in your LeadsUp inbox

📊 Test Details:
===============
- From: campaign@${YOUR_DOMAIN}
- To: essabar.yassine@gmail.com
- Reply-To: campaign@${YOUR_DOMAIN}
- Webhook: http://app.leadsup.io/api/webhooks/mailersend
- Provider: MailerSend API
- Domain: Your own verified domain!

💬 Sample Reply:
===============
"Hi! I received your campaign email and I'm very interested in your LeadsUp product. Could you please send me:
1. Pricing information
2. How to get started
3. Available features
I'm ready to purchase! Thanks!"

This will test the complete email campaign → response → capture → threading system.

Best regards,
LeadsUp Campaign System`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #2563eb;">Hi Yassine!</h2>
    
    <p>This is a test email from your LeadsUp campaign system using your own domain: <strong>${YOUR_DOMAIN}</strong></p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1f2937; margin-top: 0;">🧪 TESTING INSTRUCTIONS</h3>
      <p><strong>Please reply to this email from your Gmail account</strong> so we can test the complete email thread capture system.</p>
      
      <p>When you reply:</p>
      <ol>
        <li>Your response will be sent to: <code>campaign@${YOUR_DOMAIN}</code></li>
        <li>MailerSend will forward it to: <code>http://app.leadsup.io/api/webhooks/mailersend</code></li>
        <li>Our webhook will capture and store it in the inbox_messages table</li>
        <li>A conversation thread will be created for proper email threading</li>
        <li>You'll be able to see it in your LeadsUp inbox</li>
      </ol>
    </div>
    
    <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #059669; margin-top: 0;">📊 Test Details</h3>
      <ul>
        <li><strong>From:</strong> campaign@${YOUR_DOMAIN}</li>
        <li><strong>To:</strong> essabar.yassine@gmail.com</li>
        <li><strong>Reply-To:</strong> campaign@${YOUR_DOMAIN}</li>
        <li><strong>Webhook:</strong> http://app.leadsup.io/api/webhooks/mailersend</li>
        <li><strong>Provider:</strong> MailerSend API</li>
        <li><strong>Domain:</strong> Your own verified domain! ✅</li>
      </ul>
    </div>
    
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #92400e; margin-top: 0;">💬 Sample Reply</h3>
      <p style="font-style: italic;">"Hi! I received your campaign email and I'm very interested in your LeadsUp product. Could you please send me:<br>
      1. Pricing information<br>
      2. How to get started<br>
      3. Available features<br>
      I'm ready to purchase! Thanks!"</p>
    </div>
    
    <p>This will test the complete email campaign → response → capture → threading system.</p>
    
    <p><strong>Best regards,<br>LeadsUp Campaign System</strong></p>
</div>`,
    reply_to: [
      {
        email: `campaign@${YOUR_DOMAIN}`,
        name: 'LeadsUp Campaign'
      }
    ]
  };
  
  try {
    const response = await fetch(`${API_BASE}/email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
    
    let result = {};
    const responseText = await response.text();
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.log('Response text:', responseText);
      }
    }
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok || response.status === 202) {
      console.log('\\n🎉 EMAIL SENT SUCCESSFULLY FROM YOUR DOMAIN!');
      console.log('=============================================');
      console.log(`✅ From: campaign@${YOUR_DOMAIN}`);
      console.log(`✅ To: essabar.yassine@gmail.com`);
      console.log(`✅ Reply-To: campaign@${YOUR_DOMAIN}`);
      console.log(`✅ Provider: MailerSend API`);
      console.log(`✅ Status: ${response.status === 202 ? 'Queued for delivery' : 'Sent'}`);
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('1. ✅ Check essabar.yassine@gmail.com inbox');
      console.log('2. ✉️  Reply to the email from Gmail');
      console.log('3. 📡 Configure MailerSend inbound webhook');
      console.log('4. 🎯 Test webhook captures your reply');
      console.log('');
      console.log('⏰ Email should arrive in 1-2 minutes...');
      
    } else {
      console.log('\\n❌ EMAIL SEND FAILED');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('\\n❌ Error sending email:', error.message);
  }
  
  console.log('\\n🔧 WEBHOOK CONFIGURATION NEEDED:');
  console.log('=================================');
  console.log('Go to MailerSend dashboard:');
  console.log('1. Navigate to: Inbound → Routes');
  console.log('2. Add route for: app.leadsup.io');
  console.log('3. Pattern: campaign@app.leadsup.io');
  console.log('4. Forward to webhook: http://app.leadsup.io/api/webhooks/mailersend');
  console.log('5. Enable the route');
}

testLeadsUpDomain().catch(console.error);