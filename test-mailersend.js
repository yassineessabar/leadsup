#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testMailerSend() {
  console.log('📧 MAILERSEND API TEST WITH YOUR DOMAIN');
  console.log('=======================================\n');
  
  const MAILERSEND_API_TOKEN = 'mlsn.d4d0b8f1142574ad19677c2beb61e2d0cbac863cca603b277cd85021370a0b3e';
  const API_BASE = 'https://api.mailersend.com/v1';
  const YOUR_DOMAIN = 'test-xkjn41mj8894z781.mlsender.net';
  
  console.log(`🎯 Using verified domain: ${YOUR_DOMAIN}`);
  console.log('');
  
  // Send test email
  console.log('📤 Sending test email...');
  
  const emailData = {
    from: {
      email: `campaign@${YOUR_DOMAIN}`,
      name: 'LeadsUp Campaign'
    },
    to: [
      {
        email: 'essabar.yassine@gmail.com',
        name: 'Yassine'
      }
    ],
    subject: 'LeadsUp Campaign - Test Email for Webhook Integration',
    text: `Hi Yassine!

This is a test email from LeadsUp using MailerSend API with your verified domain.

Please reply to this email from your Gmail account so we can test the webhook capture system.

When you reply:
1. Your response will be sent to campaign@${YOUR_DOMAIN}  
2. MailerSend should forward it to our webhook
3. It will be stored in the inbox_messages table
4. A conversation thread will be created

Test details:
- From: campaign@${YOUR_DOMAIN}
- To: essabar.yassine@gmail.com
- Reply-to: campaign@${YOUR_DOMAIN}
- Webhook: http://app.leadsup.io/api/webhooks/mailersend

Please reply with something like: "I'm interested in your product, please send pricing information!"

Thanks for testing!
LeadsUp Team`,
    html: `<p>Hi Yassine!</p>

<p>This is a test email from LeadsUp using <strong>MailerSend API</strong> with your verified domain.</p>

<p><strong>Please reply to this email from your Gmail account</strong> so we can test the webhook capture system.</p>

<p>When you reply:</p>
<ol>
<li>Your response will be sent to campaign@${YOUR_DOMAIN}</li>
<li>MailerSend should forward it to our webhook</li>
<li>It will be stored in the inbox_messages table</li>
<li>A conversation thread will be created</li>
</ol>

<p><strong>Test details:</strong></p>
<ul>
<li>From: campaign@${YOUR_DOMAIN}</li>
<li>To: essabar.yassine@gmail.com</li>
<li>Reply-to: campaign@${YOUR_DOMAIN}</li>
<li>Webhook: http://app.leadsup.io/api/webhooks/mailersend</li>
</ul>

<p>Please reply with something like: <em>"I'm interested in your product, please send pricing information!"</em></p>

<p>Thanks for testing!<br>
<strong>LeadsUp Team</strong></p>`,
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
      result = JSON.parse(responseText);
    }
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log('\n🎉 EMAIL SENT SUCCESSFULLY!');
      console.log('===========================');
      console.log(`✅ Message ID: ${result.message_id || result.id || 'N/A'}`);
      console.log(`📧 From: campaign@${YOUR_DOMAIN}`);
      console.log(`📨 To: essabar.yassine@gmail.com`);
      console.log(`🔄 Reply-To: campaign@${YOUR_DOMAIN}`);
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('1. ✅ Check essabar.yassine@gmail.com inbox');
      console.log('2. ✉️  Reply to the email from Gmail');
      console.log('3. 📡 Your reply will go to campaign@' + YOUR_DOMAIN);
      console.log('4. 🎯 We need to set up MailerSend webhook next');
      console.log('');
      console.log('⏰ Email should arrive in 1-2 minutes...');
      
    } else {
      console.log('\n❌ EMAIL SEND FAILED');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.errors) {
        console.log('\nError details:');
        Object.entries(result.errors).forEach(([field, messages]) => {
          console.log(`  ${field}: ${messages.join(', ')}`);
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error sending email:', error.message);
  }
  
  console.log('\n🔧 WEBHOOK SETUP REQUIRED:');
  console.log('==========================');
  console.log('After email is sent, we need to:');
  console.log('1. Create MailerSend webhook endpoint');
  console.log('2. Configure inbound email routing');
  console.log('3. Test the webhook capture system');
}

testMailerSend().catch(console.error);