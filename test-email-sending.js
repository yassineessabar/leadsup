#!/usr/bin/env node
/**
 * Test script to send emails using JavaScript instead of n8n
 * This demonstrates the client-ready email system
 */

const nodemailer = require('nodemailer');

// Test configuration - replace with your actual values
const TEST_CONFIG = {
  // Gmail sender (you need to create App Password for this)
  sender: {
    email: 'essabar.yassine@gmail.com',
    name: 'Yassine Essabar',
    // Get this from: Gmail → Settings → Security → App passwords
    app_password: 'YOUR-16-CHAR-APP-PASSWORD' // Replace with actual app password
  },
  
  // Test recipient
  recipient: {
    email: 'essabar.yassine@gmail.com', // Send to yourself for testing
    firstName: 'Test',
    lastName: 'User',
    company: 'Test Company'
  },
  
  // Test email content
  email: {
    subject: 'Test Email from JavaScript - {{firstName}}',
    content: `Hi {{firstName}},

This is a test email sent directly from Node.js without n8n!

Best regards,
{{senderName}} from {{company}}`
  }
};

async function createGmailTransporter(senderConfig) {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: senderConfig.email,
      pass: senderConfig.app_password
    }
  });
}

async function sendTestEmail() {
  try {
    console.log('🧪 Testing JavaScript Email Sending...\n');
    
    // Check configuration
    if (TEST_CONFIG.sender.app_password === 'YOUR-16-CHAR-APP-PASSWORD') {
      console.log('❌ Please update TEST_CONFIG.sender.app_password with your Gmail App Password');
      console.log('\n📋 To create Gmail App Password:');
      console.log('1. Go to Gmail Settings → Security');
      console.log('2. Enable 2-Step Verification');
      console.log('3. Go to App passwords');
      console.log('4. Create password for "Mail"');
      console.log('5. Use the 16-character password in this script\n');
      process.exit(1);
    }

    console.log(`📧 Sender: ${TEST_CONFIG.sender.name} <${TEST_CONFIG.sender.email}>`);
    console.log(`📮 Recipient: ${TEST_CONFIG.recipient.email}`);
    console.log(`📝 Subject: ${TEST_CONFIG.email.subject}\n`);

    // Create transporter
    console.log('🔧 Creating Gmail transporter...');
    const transporter = await createGmailTransporter(TEST_CONFIG.sender);
    
    // Verify transporter
    console.log('✅ Verifying Gmail connection...');
    await transporter.verify();
    console.log('✅ Gmail connection successful!\n');

    // Replace template variables
    let subject = TEST_CONFIG.email.subject
      .replace(/{{firstName}}/g, TEST_CONFIG.recipient.firstName)
      .replace(/{{lastName}}/g, TEST_CONFIG.recipient.lastName)
      .replace(/{{company}}/g, TEST_CONFIG.recipient.company)
      .replace(/{{senderName}}/g, TEST_CONFIG.sender.name);

    let htmlContent = TEST_CONFIG.email.content
      .replace(/{{firstName}}/g, TEST_CONFIG.recipient.firstName)
      .replace(/{{lastName}}/g, TEST_CONFIG.recipient.lastName)
      .replace(/{{company}}/g, TEST_CONFIG.recipient.company)
      .replace(/{{senderName}}/g, TEST_CONFIG.sender.name)
      .replace(/\n/g, '<br>');

    // Send email
    console.log('📤 Sending test email...');
    const mailOptions = {
      from: `${TEST_CONFIG.sender.name} <${TEST_CONFIG.sender.email}>`,
      to: TEST_CONFIG.recipient.email,
      subject: subject,
      html: htmlContent,
      replyTo: TEST_CONFIG.sender.email
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📮 Sent to: ${TEST_CONFIG.recipient.email}\n`);

    console.log('🎯 Test Results:');
    console.log('✅ JavaScript email sending works!');
    console.log('✅ Template variable replacement works!');
    console.log('✅ Gmail App Password authentication works!');
    console.log('\n🚀 Ready to integrate with your campaign system!');

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔐 Authentication Error - Possible causes:');
      console.log('1. Invalid App Password');
      console.log('2. 2-Step Verification not enabled');
      console.log('3. App Passwords not enabled');
      console.log('4. Wrong Gmail account');
    }
    
    process.exit(1);
  }
}

// Test multiple senders (round-robin simulation)
async function testMultipleSenders() {
  console.log('\n🔄 Testing Multiple Sender Rotation...\n');
  
  const senders = [
    { 
      email: 'essabar.yassine@gmail.com', 
      name: 'Yassine Essabar',
      app_password: TEST_CONFIG.sender.app_password // Use same for demo
    },
    // Add more senders here when you have them
    // {
    //   email: 'anthoy2327@gmail.com',
    //   name: 'Anthony',
    //   app_password: 'ANOTHER-16-CHAR-PASSWORD'
    // }
  ];

  const recipients = [
    { email: 'essabar.yassine@gmail.com', firstName: 'Test1', company: 'Company A' },
    // { email: 'another@test.com', firstName: 'Test2', company: 'Company B' },
  ];

  for (let i = 0; i < recipients.length; i++) {
    const senderIndex = i % senders.length; // Round-robin
    const sender = senders[senderIndex];
    const recipient = recipients[i];

    console.log(`📧 Email ${i + 1}: ${recipient.email} ← ${sender.email}`);

    try {
      const transporter = await createGmailTransporter(sender);
      
      const result = await transporter.sendMail({
        from: `${sender.name} <${sender.email}>`,
        to: recipient.email,
        subject: `Multi-sender test ${i + 1} from ${sender.name}`,
        html: `Hi ${recipient.firstName},<br><br>This is email #${i + 1} sent from ${sender.email} using round-robin rotation!<br><br>Best regards,<br>${sender.name}`,
        replyTo: sender.email
      });

      console.log(`✅ Sent via ${sender.email} - Message ID: ${result.messageId}`);
      
      // Rate limiting - wait 2 seconds between emails
      if (i < recipients.length - 1) {
        console.log('⏰ Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`❌ Failed to send via ${sender.email}:`, error.message);
    }
  }

  console.log('\n🎯 Multi-sender test complete!');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--multi')) {
    await testMultipleSenders();
  } else {
    await sendTestEmail();
  }
}

main().catch(console.error);