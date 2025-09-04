// Test webhook with autoreply detection
async function testAutoReplyWebhook() {
  console.log('🧪 Testing Webhook with Auto-Reply Email');
  console.log('=' .repeat(50));

  // Create a curl command to test the webhook
  const curlCommand = `curl -X POST http://localhost:3000/api/webhooks/sendgrid \
    -F "from=john.smith@testcompany1.com" \
    -F "to=info@sigmatic-trading.com" \
    -F "subject=Out of Office: Re: Introduction - Test Sequence" \
    -F "text=Thank you for your email. I am currently out of the office with limited access to email. I will return on Monday, September 9th and will respond to your message at that time. For urgent matters, please contact my colleague at colleague@testcompany1.com." \
    -F "html=" \
    -F "headers=Auto-Submitted: auto-replied
X-Auto-Response-Suppress: All
Precedence: auto_reply" \
    -F 'envelope={"from":"john.smith@testcompany1.com","to":["info@sigmatic-trading.com"]}' \
    -F "spam_score=0.1"`;

  console.log('📤 Sending auto-reply webhook to /api/webhooks/sendgrid...');
  console.log('Command:', curlCommand);
  console.log('');
  
  const { exec } = require('child_process');
  
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📨 Response:', stdout);
    console.log('');
    console.log('⚠️  IMPORTANT: Check the server logs to verify:');
    console.log('   1. Auto-reply was detected (look for "🤖 Autoreply detected")');
    console.log('   2. Contact was NOT marked as "Replied" (look for "NOT updating contact status")');
    console.log('   3. Message was stored with is_autoreply: true in provider_data');
    console.log('');
    console.log('✅ If you see these in the logs, the auto-reply detection is working correctly!');
  });
}

// Test normal reply for comparison
async function testNormalReplyWebhook() {
  console.log('\n🧪 Testing Webhook with Normal Reply Email');
  console.log('=' .repeat(50));

  const curlCommand = `curl -X POST http://localhost:3000/api/webhooks/sendgrid \
    -F "from=john.smith@testcompany1.com" \
    -F "to=info@sigmatic-trading.com" \
    -F "subject=Re: Introduction - Test Sequence" \
    -F "text=Hi there! Thanks for reaching out. I would love to learn more about your solution. Can we schedule a call this week? Best regards, John" \
    -F "html=" \
    -F "headers=Message-ID: <abc123@testcompany1.com>" \
    -F 'envelope={"from":"john.smith@testcompany1.com","to":["info@sigmatic-trading.com"]}' \
    -F "spam_score=0.1"`;

  console.log('📤 Sending normal reply webhook to /api/webhooks/sendgrid...');
  console.log('Command:', curlCommand);
  console.log('');
  
  const { exec } = require('child_process');
  
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📨 Response:', stdout);
    console.log('');
    console.log('✅ IMPORTANT: Check the server logs to verify:');
    console.log('   1. Auto-reply was NOT detected');
    console.log('   2. Contact WAS marked as "Replied" (look for "Updated contact...status to Replied")');
    console.log('   3. Message was stored with is_autoreply: false in provider_data');
    console.log('');
    console.log('✅ This demonstrates the difference between auto-replies and genuine replies!');
  });
}

// Run tests
(async () => {
  await testAutoReplyWebhook();
  
  // Wait before sending the normal reply
  setTimeout(() => {
    testNormalReplyWebhook();
  }, 3000);
})();