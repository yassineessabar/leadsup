require('dotenv').config({ path: '.env.local' });
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(SENDGRID_API_KEY);

async function sendFreshTest() {
  console.log('\n🚀 FRESH EMAIL CAPTURE TEST');
  console.log('============================\n');
  
  const timestamp = new Date().toLocaleTimeString();
  
  try {
    const recipientEmail = 'ecomm2405@gmail.com';
    
    const msg = {
      to: recipientEmail,
      from: {
        email: 'contact@leadsup.io',
        name: 'Contact Team'
      },
      subject: `FRESH TEST ${timestamp} - Email Capture Verification`,
      text: `Hi there,

This is a FRESH test at ${timestamp} to verify email capture!

✅ Sent from: contact@leadsup.io  
✅ Reply-to: test@reply.leadsup.io
⏰ Time: ${timestamp}

Reply to this email with "FRESH TEST REPLY" and we'll check if it's captured!

Best regards,
Contact Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🔄 FRESH TEST ${timestamp}</h2>
          <p>Hi there,</p>
          <p>This is a FRESH test at <strong>${timestamp}</strong> to verify email capture!</p>
          
          <div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">📧 Test Details:</h3>
            <p><strong>Sent from:</strong> contact@leadsup.io</p>  
            <p><strong>Reply-to:</strong> test@reply.leadsup.io</p>
            <p><strong>Time:</strong> ${timestamp}</p>
          </div>
          
          <p><strong>Reply to this email with "FRESH TEST REPLY" and we'll check if it's captured!</strong></p>
          
          <hr style="margin: 20px 0;">
          <p>Best regards,<br>Contact Team</p>
        </div>
      `,
      replyTo: 'test@reply.leadsup.io'
    };

    console.log('📤 Sending fresh test email...');
    console.log(`   From: ${msg.from.email}`);
    console.log(`   To: ${recipientEmail}`);
    console.log(`   Reply-To: ${msg.replyTo}`);
    console.log(`   Subject: ${msg.subject}`);
    console.log(`   Time: ${timestamp}`);
    
    const result = await sgMail.send(msg);
    
    console.log('\n✅ Email sent successfully!');
    console.log(`   Message ID: ${result[0].headers?.['x-message-id']}`);
    
    console.log('\n📝 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check your inbox for the email');
    console.log('2. Reply with "FRESH TEST REPLY"');
    console.log('3. Wait 30 seconds');
    console.log('4. Run: node check-latest-replies.js');
    console.log('5. OR run: node debug-webhook-target.js');
    console.log('');
    console.log('📊 Look for this timestamp in results:', timestamp);
    
    return result[0].headers?.['x-message-id'];
    
  } catch (error) {
    console.error('\n❌ Failed to send email:', error.message);
    return null;
  }
}

// Run the test
sendFreshTest().then(messageId => {
  if (messageId) {
    console.log(`\n🎯 Test email sent with ID: ${messageId}`);
    console.log('Reply to it and check the capture!');
  }
}).catch(error => {
  console.error('Test failed:', error);
});