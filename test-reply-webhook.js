const FormData = require('form-data');

async function simulateReplyWebhook() {
  console.log('🧪 Testing SendGrid reply webhook...');
  
  // Initialize fetch properly within the async function
  let fetch;
  try {
    fetch = (await import('node-fetch')).default;
  } catch (e) {
    fetch = require('node-fetch');
  }
  
  // Create form data that mimics SendGrid's inbound parse webhook
  const form = new FormData();
  
  // Add the fields that SendGrid sends
  form.append('from', 'john.smith@testcompany1.com');
  form.append('to', 'info@sigmatic-trading.com');
  form.append('subject', 'Re: Introduction - Test Sequence');
  form.append('text', 'Thanks for reaching out! I\'m interested in learning more about your solution.');
  form.append('html', '<p>Thanks for reaching out! I\'m interested in learning more about your solution.</p>');
  
  // Add envelope data (JSON string)
  const envelope = {
    from: 'john.smith@testcompany1.com',
    to: ['info@sigmatic-trading.com']
  };
  form.append('envelope', JSON.stringify(envelope));
  
  // Add other SendGrid fields
  form.append('spam_score', '0.1');
  form.append('spam_report', '');
  form.append('attachments', '0');
  form.append('charsets', '{}');
  form.append('headers', 'Received: from mail.example.com');
  
  try {
    console.log('📨 Sending webhook to localhost:3000/api/webhooks/sendgrid...');
    
    const response = await fetch('http://localhost:3000/api/webhooks/sendgrid', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const result = await response.text();
    
    console.log('📋 Response status:', response.status);
    console.log('📋 Response body:', result);
    
    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
      
      // Parse the response to get details
      try {
        const jsonResult = JSON.parse(result);
        console.log('📧 Message ID:', jsonResult.messageId);
        console.log('🔗 Conversation ID:', jsonResult.conversationId);
      } catch (e) {
        console.log('📄 Non-JSON response received');
      }
    } else {
      console.log('❌ Webhook failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error sending webhook:', error.message);
  }
}

simulateReplyWebhook();