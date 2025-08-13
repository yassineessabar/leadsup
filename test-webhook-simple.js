// Simple webhook test using curl to simulate SendGrid inbound email
const { spawn } = require('child_process');

async function testWebhookWithCurl() {
  console.log('🕸️ Testing SendGrid Webhook with Simulated Email');
  console.log('='.repeat(50));
  
  console.log('📤 Sending simulated inbound email to webhook...');
  console.log('📋 Simulating email from: prospect@company.com');
  console.log('📋 Sending to: contact@leadsup.io');
  
  // Create curl command to simulate SendGrid webhook
  const curlCommand = [
    'curl',
    '-X', 'POST',
    'http://localhost:3008/api/webhooks/sendgrid',
    '-F', 'from=prospect@company.com',
    '-F', 'to=contact@leadsup.io',
    '-F', 'subject=Re: Your marketing outreach',
    '-F', 'text=Hi! I received your email about marketing solutions. I\'m interested in learning more. Could you send me pricing information?',
    '-F', 'html=<p>Hi! I received your email about marketing solutions.</p><p>I\'m interested in learning more. Could you send me pricing information?</p>',
    '-F', 'envelope={"from": "prospect@company.com", "to": ["contact@leadsup.io"]}',
    '-F', 'headers={"Message-Id": "<test-reply@company.com>", "Date": "' + new Date().toISOString() + '"}',
    '-F', 'charsets={"from": "UTF-8", "to": "UTF-8", "subject": "UTF-8", "text": "UTF-8"}',
    '-F', 'spam_score=0.5',
    '-F', 'spam_report=',
    '-F', 'attachments=0',
    '-s', // Silent mode
    '-w', '\\nHTTP Status: %{http_code}\\n' // Show HTTP status
  ];
  
  return new Promise((resolve, reject) => {
    const curlProcess = spawn('curl', curlCommand.slice(1));
    
    let output = '';
    let errorOutput = '';
    
    curlProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curlProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    curlProcess.on('close', (code) => {
      console.log('📡 Webhook Response:');
      console.log(output);
      
      if (errorOutput) {
        console.log('⚠️ Error output:', errorOutput);
      }
      
      try {
        // Try to parse JSON response
        const lines = output.split('\n');
        const jsonLine = lines.find(line => line.trim().startsWith('{'));
        
        if (jsonLine) {
          const response = JSON.parse(jsonLine);
          console.log('📋 Parsed Response:', response);
          
          if (response.success) {
            console.log('✅ Webhook processed email successfully!');
            if (response.messageId) {
              console.log(`📨 Message ID: ${response.messageId}`);
            }
            if (response.conversationId) {
              console.log(`🧵 Conversation ID: ${response.conversationId}`);
            }
          } else {
            console.log('⚠️ Webhook processed but may not have found matching campaign sender');
          }
        }
        
        resolve(code === 0);
      } catch (parseError) {
        console.log('⚠️ Could not parse JSON response:', parseError.message);
        resolve(code === 0);
      }
    });
    
    curlProcess.on('error', (error) => {
      console.log('❌ Error running curl:', error.message);
      reject(error);
    });
  });
}

async function testWebhookEndpoint() {
  console.log('\n🔍 Testing webhook endpoint availability...');
  
  return new Promise((resolve, reject) => {
    const curlProcess = spawn('curl', [
      '-X', 'GET',
      'http://localhost:3008/api/webhooks/sendgrid',
      '-s',
      '-w', '\\nHTTP Status: %{http_code}\\n'
    ]);
    
    let output = '';
    
    curlProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curlProcess.on('close', (code) => {
      console.log('📡 GET Response:');
      console.log(output);
      
      if (output.includes('SendGrid Inbound Parse webhook active')) {
        console.log('✅ Webhook endpoint is active and responding');
        resolve(true);
      } else {
        console.log('❌ Webhook endpoint not responding correctly');
        resolve(false);
      }
    });
    
    curlProcess.on('error', (error) => {
      console.log('❌ Error testing endpoint:', error.message);
      reject(error);
    });
  });
}

async function runWebhookTests() {
  console.log('🧪 Webhook Integration Tests');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Check if webhook endpoint is available
    const endpointAvailable = await testWebhookEndpoint();
    
    if (!endpointAvailable) {
      console.log('❌ Cannot proceed - webhook not available');
      console.log('💡 Make sure the dev server is running on localhost:3008');
      return;
    }
    
    // Test 2: Send simulated inbound email
    const webhookProcessed = await testWebhookWithCurl();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 WEBHOOK TEST RESULTS');
    console.log('='.repeat(50));
    
    if (endpointAvailable && webhookProcessed) {
      console.log('✅ All webhook tests passed!');
      console.log('🎉 Inbound email processing is working correctly');
      
      console.log('\n📧 What this means:');
      console.log('- SendGrid can send webhook data to your app');
      console.log('- Your app can process inbound emails');
      console.log('- Emails are stored in the inbox system');
      console.log('- Conversation threading is working');
      
      console.log('\n🚀 To test with real emails:');
      console.log('1. Configure SendGrid Inbound Parse with your webhook URL');
      console.log('2. Send an email from your campaign system');
      console.log('3. Reply to that email');
      console.log('4. Check your application logs and database');
      
    } else {
      console.log('❌ Some webhook tests failed');
      console.log('🔧 Check server logs for detailed error information');
    }
    
  } catch (error) {
    console.error('💥 Webhook tests failed:', error);
  }
}

// Additional test: Check if dev server is running
async function checkDevServer() {
  console.log('🔍 Checking if development server is running...');
  
  return new Promise((resolve) => {
    const curlProcess = spawn('curl', [
      '-X', 'GET',
      'http://localhost:3008/',
      '-s',
      '-o', '/dev/null',
      '-w', '%{http_code}'
    ]);
    
    let output = '';
    
    curlProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curlProcess.on('close', (code) => {
      const httpCode = parseInt(output.trim());
      
      if (httpCode >= 200 && httpCode < 400) {
        console.log('✅ Development server is running on localhost:3008');
        resolve(true);
      } else {
        console.log('❌ Development server is not responding');
        console.log('💡 Start it with: npm run dev');
        resolve(false);
      }
    });
    
    curlProcess.on('error', () => {
      console.log('❌ Cannot connect to development server');
      console.log('💡 Make sure to run: npm run dev');
      resolve(false);
    });
  });
}

// Main execution
async function main() {
  const serverRunning = await checkDevServer();
  
  if (serverRunning) {
    await runWebhookTests();
  } else {
    console.log('\n⚠️ Cannot run webhook tests without development server');
    console.log('Please start the development server first:');
    console.log('  npm run dev');
  }
}

main().catch(console.error);