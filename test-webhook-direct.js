#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function simulateMailgunWebhook() {
  console.log('🧪 SIMULATING MAILGUN WEBHOOK CALL');
  console.log('==================================\n');
  
  const webhookUrl = 'http://app.leadsup.io/api/webhooks/mailgun';
  const timestamp = Math.floor(Date.now() / 1000);
  const token = 'webhook-test-' + timestamp;
  
  console.log('📡 Webhook URL:', webhookUrl);
  console.log('⏰ Timestamp:', timestamp);
  console.log('🎫 Token:', token);
  console.log('');
  
  // Create form data exactly as Mailgun would send it
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  
  // Email details - simulating your reply from Gmail
  formData.append('sender', 'essabar.yassine@gmail.com');
  formData.append('recipient', 'campaign@sandbox09593b053aaa4a158cfdada61cbbdb0d.mailgun.org');
  formData.append('subject', 'Re: LeadsUp Campaign - Very Interested in Your Product!');
  formData.append('body-plain', `Hi there!

I received your campaign email and I am very interested in learning more about your product.

Could you please send me:
1. Pricing information
2. Available packages/plans  
3. How to get started
4. Any special offers for new customers

I think this would be perfect for my business needs and I'm ready to move forward.

Looking forward to hearing from you soon!

Best regards,
Yassine`);
  
  formData.append('body-html', `<p>Hi there!</p>

<p>I received your campaign email and I am <strong>very interested</strong> in learning more about your product.</p>

<p>Could you please send me:</p>
<ol>
<li>Pricing information</li>
<li>Available packages/plans</li>
<li>How to get started</li>
<li>Any special offers for new customers</li>
</ol>

<p>I think this would be perfect for my business needs and I'm <strong>ready to move forward</strong>.</p>

<p>Looking forward to hearing from you soon!</p>

<p>Best regards,<br>
Yassine</p>`);
  
  formData.append('Message-Id', `simulated-webhook-${timestamp}@gmail.com`);
  formData.append('timestamp', timestamp.toString());
  formData.append('token', token);
  formData.append('signature', 'test-signature-' + timestamp);
  formData.append('attachment-count', '0');
  
  console.log('📤 Simulating inbound email:');
  console.log('   From: essabar.yassine@gmail.com');
  console.log('   To: campaign@sandbox...mailgun.org');
  console.log('   Subject: Re: LeadsUp Campaign - Very Interested!');
  console.log('   Body: Interested prospect response...');
  console.log('');
  
  try {
    console.log('🚀 Sending webhook request...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mailgun/Test-Webhook'
      },
      body: formData
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📄 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n🎉 WEBHOOK TEST SUCCESSFUL!');
      console.log('=============================');
      console.log(`✅ Message ID: ${result.messageId}`);
      console.log(`✅ Conversation ID: ${result.conversationId}`);
      console.log(`✅ Direction: ${result.direction}`);
      console.log(`✅ Processed: ${result.processed}`);
      console.log('');
      console.log('🎯 This proves your webhook is working correctly!');
      console.log('When real emails come through Mailgun, they will be captured just like this.');
      
      return result;
      
    } else {
      console.log('\n❌ WEBHOOK TEST FAILED');
      console.log('Response details:', result);
      return null;
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    return null;
  }
}

// Run the simulation
simulateMailgunWebhook()
  .then(result => {
    if (result) {
      console.log('\n✅ Webhook simulation complete - SUCCESS!');
      process.exit(0);
    } else {
      console.log('\n❌ Webhook simulation complete - FAILED!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Simulation error:', error);
    process.exit(1);
  });