#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function sendTestEmail() {
  console.log('📤 SENDING TEST EMAIL VIA MAILGUN');
  console.log('=================================\n');
  
  const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
  const MAILGUN_DOMAIN = 'sandbox09593b053aaa4a158cfdada61cbbdb0d.mailgun.org';
  
  if (!MAILGUN_API_KEY) {
    console.error('❌ MAILGUN_API_KEY not found in environment');
    return;
  }
  
  const fromEmail = 'ecomm2405@gmail.com';
  const toEmail = 'essabar.yassine@gmail.com';
  const subject = 'LeadsUp Campaign - Test Email Thread for Webhook';
  const messageId = `test-thread-${Date.now()}@leadsup.com`;
  
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  
  formData.append('from', `LeadsUp Campaign <campaign@${MAILGUN_DOMAIN}>`);
  formData.append('to', toEmail);
  formData.append('subject', subject);
  formData.append('text', `Hi Yassine!

This is a test email from LeadsUp campaign system to test the webhook integration.

Please reply to this email from your Gmail account (essabar.yassine@gmail.com) so we can test if the webhook captures your inbound response correctly.

When you reply:
1. Your response should be captured by the Mailgun webhook
2. It should be stored in the inbox_messages table  
3. It should create a proper conversation thread

Test details:
- Campaign sender: ecomm2405@gmail.com
- Original recipient: essabar.yassine@gmail.com
- Message ID: ${messageId}
- Webhook endpoint: http://app.leadsup.io/api/webhooks/mailgun

Thanks for testing!
LeadsUp Team`);
  
  formData.append('html', `<p>Hi Yassine!</p>

<p>This is a test email from LeadsUp campaign system to test the webhook integration.</p>

<p><strong>Please reply to this email from your Gmail account (essabar.yassine@gmail.com)</strong> so we can test if the webhook captures your inbound response correctly.</p>

<p>When you reply:</p>
<ol>
<li>Your response should be captured by the Mailgun webhook</li>
<li>It should be stored in the inbox_messages table</li>
<li>It should create a proper conversation thread</li>
</ol>

<p><strong>Test details:</strong></p>
<ul>
<li>Campaign sender: ecomm2405@gmail.com</li>
<li>Original recipient: essabar.yassine@gmail.com</li>
<li>Message ID: ${messageId}</li>
<li>Webhook endpoint: http://app.leadsup.io/api/webhooks/mailgun</li>
</ul>

<p>Thanks for testing!<br>
LeadsUp Team</p>`);
  
  formData.append('h:Message-ID', messageId);
  formData.append('h:Reply-To', `campaign@${MAILGUN_DOMAIN}`);
  
  console.log(`📧 Sending email:`);
  console.log(`   From: campaign@${MAILGUN_DOMAIN} (on behalf of ecomm2405@gmail.com)`);
  console.log(`   To: ${toEmail}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Message-ID: ${messageId}`);
  console.log(`   Reply-To: campaign@${MAILGUN_DOMAIN}`);
  console.log('');
  
  try {
    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')
      },
      body: formData
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log('\n🎉 EMAIL SENT SUCCESSFULLY!');
      console.log('===========================');
      console.log(`✅ Mailgun ID: ${result.id}`);
      console.log(`✅ Message: ${result.message}`);
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('1. ✅ Check essabar.yassine@gmail.com inbox');
      console.log('2. ✉️  Reply to the email from Gmail');
      console.log('3. 📡 Response will be sent to campaign@sandbox...mailgun.org');
      console.log('4. 🎯 Webhook should capture the reply automatically');
      console.log('');
      console.log('⏰ Email should arrive in 1-2 minutes...');
      
    } else {
      console.log('\n❌ EMAIL SEND FAILED');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error sending email:', error.message);
  }
}

sendTestEmail().catch(console.error);