const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWebhookFix() {
  console.log('\n🔬 TESTING IF WEBHOOK FIX IS DEPLOYED');
  console.log('======================================\n');
  
  const webhookUrl = 'https://app.leadsup.io/api/webhooks/sendgrid';
  
  try {
    console.log('📤 Testing webhook with reply@leadsup.io...');
    
    // Test the exact scenario that was failing
    const formData = new URLSearchParams();
    formData.append('from', 'ecomm2405@gmail.com');
    formData.append('to', 'reply@leadsup.io'); // This was the failing case
    formData.append('subject', 'Re: PRODUCTION TEST: Email Reply Capture');
    formData.append('text', 'This is my test reply to check if the fix works!');
    formData.append('html', '<p>This is my test reply to check if the fix works!</p>');
    formData.append('envelope', JSON.stringify({
      from: 'ecomm2405@gmail.com',
      to: ['reply@leadsup.io']
    }));
    formData.append('spam_score', '0.1');
    formData.append('attachments', '0');
    formData.append('charsets', '{"to":"UTF-8","subject":"UTF-8","from":"UTF-8","text":"UTF-8"}');
    formData.append('headers', `From: ecomm2405@gmail.com
To: reply@leadsup.io
Subject: Re: PRODUCTION TEST: Email Reply Capture
Date: ${new Date().toISOString()}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SendGrid/v3'
      },
      body: formData
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    const result = await response.json();
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.messageId) {
      console.log('\n✅ SUCCESS! Webhook fix is deployed and working!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log(`🧵 Conversation ID: ${result.conversationId}`);
      console.log('');
      console.log('🎯 The webhook can now process reply@leadsup.io emails');
      
      return true;
    } else if (result.success && result.message === 'Not a campaign email, ignored') {
      console.log('\n❌ Webhook fix NOT deployed yet');
      console.log('The webhook is still rejecting reply@leadsup.io emails');
      console.log('');
      console.log('💡 Solutions:');
      console.log('1. Wait a few more minutes for deployment');
      console.log('2. Check if auto-deployment is enabled');
      console.log('3. Manually trigger deployment');
      
      return false;
    } else {
      console.log('\n❌ Webhook processing failed');
      console.log('Error:', result.error || result.message);
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function checkDeploymentStatus() {
  console.log('\n📋 DEPLOYMENT STATUS CHECK');
  console.log('===========================\n');
  
  try {
    // Check if the webhook endpoint is accessible
    const response = await fetch('https://app.leadsup.io/api/webhooks/sendgrid', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Production webhook is online');
      console.log('📊 Status:', data.status);
      console.log('🕐 Last check:', data.timestamp);
      
      // Try to determine if our code changes are deployed
      console.log('\n🔍 Checking if fix is deployed...');
      
    } else {
      console.log('❌ Production webhook not accessible');
    }
    
  } catch (error) {
    console.log('❌ Cannot reach production webhook');
  }
  
  console.log('\n📝 If webhook fix is not deployed:');
  console.log('1. Check your deployment pipeline');
  console.log('2. Verify auto-deployment from main branch');
  console.log('3. Check deployment logs for errors');
  console.log('4. Manually trigger deployment if needed');
}

async function suggestNextSteps() {
  console.log('\n📋 NEXT STEPS BASED ON RESULTS');
  console.log('===============================\n');
  
  const isFixed = await testWebhookFix();
  
  if (isFixed) {
    console.log('🎉 Webhook fix is working! The issue might be:');
    console.log('1. SendGrid is not sending webhooks (check Activity Feed)');
    console.log('2. Email routing/DNS issue');
    console.log('3. SendGrid configuration problem');
    console.log('');
    console.log('🔍 Check SendGrid Activity Feed for your replies');
    
  } else {
    console.log('⚠️  Webhook fix not deployed yet. Steps:');
    console.log('1. Wait for deployment to complete');
    console.log('2. Check deployment status in your hosting dashboard');
    console.log('3. Test webhook again in a few minutes');
  }
  
  await checkDeploymentStatus();
}

// Main execution
suggestNextSteps().catch(error => {
  console.error('Fatal error:', error);
});