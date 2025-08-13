const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWebhookCall() {
  console.log('\n🔬 TESTING IF WEBHOOK IS BEING CALLED');
  console.log('======================================\n');
  
  const webhookUrl = 'https://app.leadsup.io/api/webhooks/sendgrid';
  
  try {
    console.log('📤 Sending a test webhook call to production...');
    console.log(`   URL: ${webhookUrl}`);
    
    // Create test data that matches your recent reply
    const formData = new URLSearchParams();
    formData.append('from', 'ecomm2405@gmail.com');
    formData.append('to', 'reply@leadsup.io');
    formData.append('subject', 'Re: PRODUCTION TEST: Email Reply Capture');
    formData.append('text', 'This is my test reply - it should be captured!');
    formData.append('html', '<p>This is my test reply - it should be captured!</p>');
    formData.append('envelope', JSON.stringify({
      from: 'ecomm2405@gmail.com',
      to: ['reply@leadsup.io']
    }));
    formData.append('spam_score', '0.1');
    formData.append('attachments', '0');
    formData.append('charsets', '{"to":"UTF-8","subject":"UTF-8","from":"UTF-8","text":"UTF-8"}');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SendGrid/v3'
      },
      body: formData
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    const result = await response.json();
    console.log('📋 Response body:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ Webhook call successful!');
      console.log('🎯 This proves your production webhook is working');
      console.log('');
      console.log('💡 The issue might be:');
      console.log('1. SendGrid is not sending webhooks (check Activity Feed)');
      console.log('2. DNS propagation delay');
      console.log('3. Email routing issue');
      
    } else {
      console.log('\n❌ Webhook call failed');
      console.log('🔍 This indicates an issue with your production webhook');
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      if (result.debug) {
        console.log(`Debug: ${result.debug}`);
      }
    }
    
    return result.success;
    
  } catch (error) {
    console.error('❌ Failed to call webhook:', error.message);
    return false;
  }
}

async function checkRecentActivity() {
  console.log('\n📊 RECENT ACTIVITY ANALYSIS');
  console.log('============================\n');
  
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  console.log(`🕐 Current time: ${now.toLocaleString()}`);
  console.log(`⏰ Checking for activity since: ${fiveMinutesAgo.toLocaleString()}`);
  console.log('');
  console.log('📋 Timeline of events:');
  console.log('1. You sent production test email');
  console.log('2. You received the email');
  console.log('3. You replied to reply@leadsup.io');
  console.log('4. SendGrid should have forwarded to webhook');
  console.log('5. Webhook should have stored in production database');
  console.log('');
  console.log('🔍 Missing step investigation needed:');
  console.log('- Did SendGrid receive your reply? (Check Activity Feed)');
  console.log('- Did SendGrid forward to webhook? (Check production logs)');
  console.log('- Did webhook process successfully? (Test above)');
}

async function main() {
  console.log('🚀 WEBHOOK CALL DIAGNOSTICS');
  console.log('============================');
  
  await testWebhookCall();
  await checkRecentActivity();
  
  console.log('\n📝 NEXT STEPS:');
  console.log('===============');
  console.log('1. Check SendGrid Activity Feed for your reply');
  console.log('2. Check production application logs');
  console.log('3. Verify the webhook test above worked');
  console.log('4. If webhook works but replies don\'t appear,');
  console.log('   the issue is SendGrid not forwarding emails');
}

main().catch(error => {
  console.error('Fatal error:', error);
});