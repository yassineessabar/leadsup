require('dotenv').config();
const sgMail = require('@sendgrid/mail');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY environment variable is not set!');
  console.log('Please set it in your .env file or export it:');
  console.log('export SENDGRID_API_KEY=your_api_key_here');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

async function testDirectSendGridEmail() {
  console.log('\n=================================================');
  console.log('📧 DIRECT SENDGRID EMAIL TEST');
  console.log('=================================================\n');

  try {
    // Get email details from user
    const fromEmail = await question('Enter FROM email address (must be verified in SendGrid): ');
    const fromName = await question('Enter FROM name (optional, press Enter to skip): ') || fromEmail;
    const toEmail = await question('Enter TO email address: ');
    const subject = await question('Enter email subject: ') || 'Test Email from LeadsUp';
    
    console.log('\n📝 Enter email body (press Enter twice to finish):');
    let body = '';
    let lastLine = '';
    
    while (true) {
      const line = await question('');
      if (line === '' && lastLine === '') break;
      body += line + '\n';
      lastLine = line;
    }

    body = body.trim() || 'This is a test email sent via SendGrid from LeadsUp.';

    console.log('\n📤 Sending email via SendGrid...');
    console.log('From:', `${fromName} <${fromEmail}>`);
    console.log('To:', toEmail);
    console.log('Subject:', subject);
    console.log('Body:', body.substring(0, 100) + (body.length > 100 ? '...' : ''));

    const msg = {
      to: toEmail,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      replyTo: fromEmail
    };

    const result = await sgMail.send(msg);
    
    console.log('\n✅ Email sent successfully!');
    console.log('📊 SendGrid Response:');
    console.log('   Status Code:', result[0].statusCode);
    console.log('   Message ID:', result[0].headers?.['x-message-id']);
    console.log('   Request ID:', result[0].headers?.['x-sendgrid-request-id']);
    
    return true;

  } catch (error) {
    console.error('\n❌ Failed to send email:');
    
    if (error.response) {
      console.error('   Status Code:', error.response.statusCode);
      console.error('   Error:', error.response.body);
      
      if (error.response.body?.errors) {
        console.error('\n📝 Detailed errors:');
        error.response.body.errors.forEach((err, index) => {
          console.error(`   ${index + 1}. ${err.message}`);
          if (err.field) console.error(`      Field: ${err.field}`);
          if (err.help) console.error(`      Help: ${err.help}`);
        });
      }
    } else {
      console.error('   Error:', error.message);
    }
    
    return false;
  }
}

async function testSendGridWebhook() {
  console.log('\n=================================================');
  console.log('🔗 SENDGRID WEBHOOK TEST');
  console.log('=================================================\n');

  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const webhookUrl = `${BASE_URL}/api/webhooks/sendgrid`;

  console.log('📝 SendGrid Inbound Parse Webhook Configuration:');
  console.log('   Webhook URL:', webhookUrl);
  console.log('\n⚙️ To set up SendGrid Inbound Parse:');
  console.log('1. Go to SendGrid Dashboard > Settings > Inbound Parse');
  console.log('2. Click "Add Host & URL"');
  console.log('3. Configure:');
  console.log('   - Subdomain: reply (or any subdomain)');
  console.log('   - Domain: your-domain.com');
  console.log('   - Destination URL:', webhookUrl);
  console.log('   - Check "POST the raw, full MIME message"');
  console.log('4. Add MX record to your DNS:');
  console.log('   - Type: MX');
  console.log('   - Host: reply (or your chosen subdomain)');
  console.log('   - Value: mx.sendgrid.net');
  console.log('   - Priority: 10');
  console.log('\n📧 Once configured, emails sent to reply@your-domain.com');
  console.log('   will be forwarded to your webhook endpoint.');
  
  const testWebhook = await question('\nDo you want to test the webhook endpoint? (y/n): ');
  
  if (testWebhook.toLowerCase() === 'y') {
    console.log('\n🔍 Testing webhook endpoint...');
    
    try {
      const fetch = require('node-fetch');
      const response = await fetch(webhookUrl, {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Webhook endpoint is accessible!');
        console.log('📊 Endpoint info:', data);
      } else {
        console.log('❌ Webhook endpoint returned error:', response.status);
      }
    } catch (error) {
      console.log('❌ Could not reach webhook endpoint:', error.message);
      console.log('   Make sure your application is running at:', BASE_URL);
    }
  }
}

async function verifySendGridSetup() {
  console.log('\n=================================================');
  console.log('🔍 SENDGRID CONFIGURATION VERIFICATION');
  console.log('=================================================\n');

  console.log('📝 Checking SendGrid API Key...');
  
  try {
    // Test API key by fetching verified senders
    const client = require('@sendgrid/client');
    client.setApiKey(SENDGRID_API_KEY);
    
    const [response] = await client.request({
      method: 'GET',
      url: '/v3/verified_senders'
    });
    
    console.log('✅ SendGrid API Key is valid!');
    
    if (response.body?.results && response.body.results.length > 0) {
      console.log('\n📧 Verified Senders:');
      response.body.results.forEach((sender, index) => {
        console.log(`   ${index + 1}. ${sender.from_name} <${sender.from_email}>`);
        console.log(`      Status: ${sender.verified ? '✅ Verified' : '⚠️ Pending verification'}`);
      });
    } else {
      console.log('\n⚠️ No verified senders found!');
      console.log('   You need to verify at least one sender email address.');
      console.log('   Go to: https://app.sendgrid.com/settings/sender_auth/senders');
    }
    
    // Check for domain authentication
    const [domainResponse] = await client.request({
      method: 'GET',
      url: '/v3/whitelabel/domains'
    });
    
    if (domainResponse.body && domainResponse.body.length > 0) {
      console.log('\n🌐 Authenticated Domains:');
      domainResponse.body.forEach((domain, index) => {
        console.log(`   ${index + 1}. ${domain.domain}`);
        console.log(`      Valid: ${domain.valid ? '✅ Yes' : '❌ No'}`);
      });
    } else {
      console.log('\n📝 No authenticated domains found.');
      console.log('   Domain authentication improves deliverability.');
      console.log('   Set up at: https://app.sendgrid.com/settings/sender_auth/domains');
    }
    
  } catch (error) {
    console.error('❌ Failed to verify SendGrid setup:');
    if (error.response) {
      console.error('   Status:', error.response.statusCode);
      console.error('   Error:', error.response.body);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

// Main menu
async function main() {
  console.log('\n🚀 SENDGRID EMAIL TEST SUITE');
  console.log('=====================================\n');
  console.log('Select a test:');
  console.log('1. Send a test email directly via SendGrid');
  console.log('2. Verify SendGrid configuration');
  console.log('3. Check webhook setup instructions');
  console.log('4. Exit\n');

  const choice = await question('Enter your choice (1-4): ');

  switch(choice) {
    case '1':
      await testDirectSendGridEmail();
      break;
    case '2':
      await verifySendGridSetup();
      break;
    case '3':
      await testSendGridWebhook();
      break;
    case '4':
      console.log('Goodbye!');
      break;
    default:
      console.log('Invalid choice');
  }

  rl.close();
}

// Check if SendGrid module is installed
try {
  require('@sendgrid/mail');
  require('@sendgrid/client');
} catch (error) {
  console.error('❌ SendGrid modules not found!');
  console.log('Please install them first:');
  console.log('npm install @sendgrid/mail @sendgrid/client');
  process.exit(1);
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});