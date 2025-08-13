require('dotenv').config({ path: '.env.local' });
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(SENDGRID_API_KEY);

async function sendTestWithWorkingAddress() {
  console.log('\n📧 TESTING WITH WORKING ADDRESS');
  console.log('=================================\n');
  
  try {
    const recipientEmail = 'ecomm2405@gmail.com';
    
    const msg = {
      to: recipientEmail,
      from: {
        email: 'contact@leadsup.io',
        name: 'Contact Team'
      },
      subject: 'WORKING ADDRESS TEST: Email Reply Capture',
      text: `Hi there,

This email uses the WORKING reply address that captured emails before!

✅ Sent from: contact@leadsup.io  
✅ Reply-to: test@reply.leadsup.io (this was working!)

When you reply to this email, it should be captured just like before!

Best regards,
Contact Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>✅ WORKING ADDRESS TEST</h2>
          <p>Hi there,</p>
          <p>This email uses the WORKING reply address that captured emails before!</p>
          
          <div style="background: #e8f5e8; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin-top: 0;">✅ Using Previously Working Setup:</h3>
            <p><strong>Sent from:</strong> contact@leadsup.io</p>  
            <p><strong>Reply-to:</strong> test@reply.leadsup.io (this was working!)</p>
          </div>
          
          <p><strong>When you reply to this email, it should be captured just like before!</strong></p>
          <hr style="margin: 20px 0;">
          <p>Best regards,<br>Contact Team</p>
        </div>
      `,
      replyTo: 'test@reply.leadsup.io' // Using the working address!
    };

    console.log('📤 Sending email with working reply address...');
    console.log(`   From: ${msg.from.email}`);
    console.log(`   To: ${recipientEmail}`);
    console.log(`   Reply-To: ${msg.replyTo} ← This was working before!`);
    
    const result = await sgMail.send(msg);
    
    console.log('\n✅ Email sent successfully!');
    console.log(`   Message ID: ${result[0].headers?.['x-message-id']}`);
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Check your inbox for the email');
    console.log('2. Reply to the email');
    console.log('3. Wait 1-2 minutes');
    console.log('4. Run: node check-latest-replies.js');
    console.log('5. You should see it captured like before!');
    
    console.log('\n💡 WHY THIS SHOULD WORK:');
    console.log('- We\'re using test@reply.leadsup.io');
    console.log('- This address captured 4 previous replies successfully');
    console.log('- SendGrid configuration should be the same');
    
  } catch (error) {
    console.error('\n❌ Failed to send email:', error.message);
  }
}

// Run the test
sendTestWithWorkingAddress();