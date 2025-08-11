#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const crypto = require('crypto');

async function testMailerSendWebhook() {
  console.log('🧪 TESTING MAILERSEND WEBHOOK ENDPOINT');
  console.log('=====================================\n');
  
  const webhookUrl = 'https://leadsup.io/api/webhooks/mailersend';
  const signingSecret = 'JXRHYr0hEp90BiPoNv1WqSQkrtNTL0Id';
  
  // Simulate MailerSend inbound email webhook payload
  const webhookPayload = {
    type: 'activity.inbound',
    webhook_id: 'test-webhook-id',
    data: {
      message_id: `test-mailersend-${Date.now()}@gmail.com`,
      from: 'essabar.yassine@gmail.com',
      to: 'campaign@app.leadsup.io',
      subject: 'Re: LeadsUp Campaign - Very Interested in Your Product!',
      text: `Hi there!

I received your campaign email and I'm very interested in learning more about your LeadsUp product.

Could you please send me:
1. Pricing information
2. Available packages and features  
3. How to get started
4. Any special offers for new customers

I think this would be perfect for my business needs and I'm ready to move forward.

Looking forward to hearing from you soon!

Best regards,
Yassine`,
      html: `<p>Hi there!</p>

<p>I received your campaign email and I'm <strong>very interested</strong> in learning more about your LeadsUp product.</p>

<p>Could you please send me:</p>
<ol>
<li>Pricing information</li>
<li>Available packages and features</li>
<li>How to get started</li>
<li>Any special offers for new customers</li>
</ol>

<p>I think this would be perfect for my business needs and I'm <strong>ready to move forward</strong>.</p>

<p>Looking forward to hearing from you soon!</p>

<p>Best regards,<br>
Yassine</p>`,
      created_at: new Date().toISOString(),
      attachments: []
    }
  };
  
  const payloadString = JSON.stringify(webhookPayload);
  
  // Generate signature
  const signature = crypto.createHmac('sha256', signingSecret)
    .update(payloadString)
    .digest('hex');
  
  console.log('📡 Webhook URL:', webhookUrl);
  console.log('🔐 Signing Secret:', signingSecret.substring(0, 10) + '...');
  console.log('📝 Signature:', signature);
  console.log('');
  
  console.log('📤 Simulating MailerSend inbound email:');
  console.log('   From: essabar.yassine@gmail.com');
  console.log('   To: campaign@app.leadsup.io');
  console.log('   Subject: Re: LeadsUp Campaign - Very Interested!');
  console.log('   Type: activity.inbound');
  console.log('');
  
  try {
    console.log('🚀 Sending webhook request...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'User-Agent': 'MailerSend-Webhook/1.0'
      },
      body: payloadString
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📄 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\\n🎉 MAILERSEND WEBHOOK TEST SUCCESSFUL!');
      console.log('========================================');
      console.log(`✅ Message ID: ${result.messageId}`);
      console.log(`✅ Conversation ID: ${result.conversationId}`);
      console.log(`✅ Direction: ${result.direction}`);
      console.log(`✅ Processed: ${result.processed}`);
      console.log('\\n🎯 This proves your MailerSend webhook integration is working!');
      console.log('When real emails come through MailerSend inbound routing, they will be captured exactly like this.');
      
    } else {
      console.log('\\n❌ WEBHOOK TEST FAILED');
      console.log('Response details:', result);
    }
    
  } catch (error) {
    console.error('\\n❌ Test error:', error.message);
  }
}

testMailerSendWebhook()
  .then(() => {
    console.log('\\n✅ MailerSend webhook test complete');
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });