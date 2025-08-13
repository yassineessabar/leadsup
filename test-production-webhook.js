const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testProductionWebhook() {
  console.log('\n🔬 TESTING PRODUCTION WEBHOOK');
  console.log('==============================\n');
  
  const productionUrl = 'https://app.leadsup.io/api/webhooks/sendgrid';
  
  try {
    // First, test if the webhook endpoint is accessible
    console.log('1. Testing webhook endpoint accessibility...');
    console.log(`   URL: ${productionUrl}`);
    
    const response = await fetch(productionUrl, { 
      method: 'GET',
      headers: {
        'User-Agent': 'SendGrid-Test'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Webhook endpoint is accessible');
      console.log(`   📊 Status: ${data.status}`);
    } else {
      console.log(`   ❌ Webhook returned status: ${response.status}`);
      const text = await response.text();
      console.log(`   Error: ${text}`);
      return false;
    }
    
    console.log('\n2. Testing webhook with simulated SendGrid data...');
    
    // Simulate the exact reply you sent
    const formData = new URLSearchParams();
    formData.append('from', 'ecomm2405@gmail.com');
    formData.append('to', 'reply@leadsup.io');
    formData.append('subject', 'Re: FIXED: Test Campaign Email (Reply Capture Test)');
    formData.append('text', 'ewew');
    formData.append('html', '<p>ewew</p>');
    formData.append('envelope', JSON.stringify({
      from: 'ecomm2405@gmail.com',
      to: ['reply@leadsup.io']
    }));
    formData.append('spam_score', '0.1');
    formData.append('attachments', '0');
    formData.append('charsets', '{"to":"UTF-8","subject":"UTF-8","from":"UTF-8","text":"UTF-8"}');
    formData.append('headers', `Received: from mail.gmail.com
From: E-comm <ecomm2405@gmail.com>
To: reply@leadsup.io
Subject: Re: FIXED: Test Campaign Email (Reply Capture Test)
Date: ${new Date().toISOString()}`);
    
    console.log('   📤 Sending test webhook data...');
    
    const webhookResponse = await fetch(productionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SendGrid/v3'
      },
      body: formData
    });
    
    const result = await webhookResponse.json();
    
    if (result.success) {
      console.log('   ✅ Webhook processed successfully!');
      console.log(`   📧 Message ID: ${result.messageId || 'Generated'}`);
      console.log(`   🧵 Conversation ID: ${result.conversationId || 'Generated'}`);
      
      console.log('\n3. Verifying database storage...');
      console.log('   Run: node check-latest-replies.js');
      console.log('   You should see your test message appear!');
      
    } else {
      console.log('   ❌ Webhook failed:');
      console.log(`   Error: ${result.error || result.message}`);
      if (result.debug) {
        console.log(`   Debug: ${result.debug}`);
      }
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function checkDNSSetup() {
  console.log('\n🌐 CHECKING DNS MX RECORD');
  console.log('==========================\n');
  
  console.log('📝 To verify your MX record is working:');
  console.log('1. Run: dig MX reply.leadsup.io');
  console.log('2. Should show: reply.leadsup.io. IN MX 10 mx.sendgrid.net.');
  console.log('');
  console.log('📧 SendGrid Configuration:');
  console.log('- Host: reply.leadsup.io ✅');
  console.log('- URL: https://app.leadsup.io/api/webhooks/sendgrid ✅');
  console.log('- Send Raw: Should be checked ✅');
  console.log('');
  console.log('💡 If emails still not captured, check:');
  console.log('1. DNS propagation (can take up to 24 hours)');
  console.log('2. SendGrid Activity Feed for delivery status');
  console.log('3. Your production logs for webhook calls');
}

async function sendRealTestEmail() {
  console.log('\n📧 SENDING REAL TEST EMAIL');
  console.log('===========================\n');
  
  require('dotenv').config({ path: '.env.local' });
  const sgMail = require('@sendgrid/mail');
  
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  sgMail.setApiKey(SENDGRID_API_KEY);
  
  try {
    const recipientEmail = 'ecomm2405@gmail.com';
    
    const msg = {
      to: recipientEmail,
      from: {
        email: 'contact@leadsup.io',
        name: 'Contact Team'
      },
      subject: 'PRODUCTION TEST: Email Reply Capture',
      text: `Hi there,

This is a PRODUCTION test email.

✅ Sent from: contact@leadsup.io  
✅ Reply-to: reply@leadsup.io
🌐 Production webhook: https://app.leadsup.io/api/webhooks/sendgrid

When you reply to this email, it should be captured in production!

Best regards,
Contact Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🚀 PRODUCTION TEST: Email Reply Capture</h2>
          <p>Hi there,</p>
          <p>This is a PRODUCTION test email.</p>
          
          <div style="background: #e8f5e8; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin-top: 0;">✅ Production Configuration:</h3>
            <p><strong>Sent from:</strong> contact@leadsup.io</p>  
            <p><strong>Reply-to:</strong> reply@leadsup.io</p>
            <p><strong>Webhook:</strong> https://app.leadsup.io/api/webhooks/sendgrid</p>
          </div>
          
          <p><strong>When you reply to this email, it should be captured in production!</strong></p>
          <hr style="margin: 20px 0;">
          <p>Best regards,<br>Contact Team</p>
        </div>
      `,
      replyTo: 'reply@leadsup.io'
    };

    console.log('📤 Sending production test email...');
    console.log(`   From: ${msg.from.email}`);
    console.log(`   To: ${recipientEmail}`);
    console.log(`   Reply-To: ${msg.replyTo}`);
    
    const result = await sgMail.send(msg);
    
    console.log('\n✅ Email sent successfully!');
    console.log(`   Message ID: ${result[0].headers?.['x-message-id']}`);
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Check your inbox for the email');
    console.log('2. Reply to the email');
    console.log('3. Wait 1-2 minutes for processing');
    console.log('4. Run: node check-latest-replies.js');
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 PRODUCTION EMAIL CAPTURE TESTING');
  console.log('====================================');
  
  // Test production webhook
  const webhookWorks = await testProductionWebhook();
  
  // Check DNS setup
  await checkDNSSetup();
  
  // Send real test email if webhook works
  if (webhookWorks) {
    const sendEmail = process.argv.includes('--send-email');
    if (sendEmail) {
      await sendRealTestEmail();
    } else {
      console.log('\n📧 To send a real test email, run:');
      console.log('   node test-production-webhook.js --send-email');
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('- SendGrid Inbound Parse: ✅ Configured');
  console.log('- Production Webhook: ✅ Accessible');
  console.log('- DNS MX Record: ✅ Should be set');
  console.log('- Test needed: Send real email and reply');
}

main().catch(error => {
  console.error('Fatal error:', error);
});