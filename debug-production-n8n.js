/**
 * Debug Production n8n Workflow
 * Check what's happening with the production API calls
 */

async function debugProductionN8N() {
  console.log('🔍 Debugging Production n8n Workflow');
  console.log('=' .repeat(60));
  console.log('');

  // Test the exact URL that n8n is calling in production
  const productionUrl = 'https://app.leadsup.io/api/campaigns/automation/process-pending';
  
  console.log('📡 Testing n8n Production API Call:');
  console.log(`🌐 URL: ${productionUrl}`);
  console.log('🔐 Auth: Basic admin:password');
  console.log('-'.repeat(50));

  try {
    console.log('📤 Making request...');
    
    const response = await fetch(productionUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
        'Content-Type': 'application/json',
        'User-Agent': 'n8n-debug-test'
      }
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

    let responseText;
    try {
      responseText = await response.text();
      console.log(`📄 Raw Response: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    } catch (textError) {
      console.log('❌ Could not read response text:', textError.message);
      return;
    }

    if (!response.ok) {
      console.log('❌ HTTP Error Response');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        console.log('   🚨 404 NOT FOUND - API endpoint doesn\'t exist in production');
      } else if (response.status === 401) {
        console.log('   🚨 401 UNAUTHORIZED - Authentication failed');
      } else if (response.status === 500) {
        console.log('   🚨 500 SERVER ERROR - Production app crashed/error');
      } else if (response.status >= 300 && response.status < 400) {
        console.log('   🚨 REDIRECT - Check if URL redirects somewhere else');
      }
      
      console.log('');
      console.log('🔍 Possible Issues:');
      console.log('   1. 🌐 Production app not deployed to app.leadsup.io');
      console.log('   2. 🛣️ API route not available in production build');  
      console.log('   3. 🔐 Different auth credentials in production');
      console.log('   4. 🗄️ Database connection issues in production');
      console.log('   5. 🔒 CORS or security restrictions');
      return;
    }

    // Try to parse JSON response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.log('❌ Invalid JSON Response');
      console.log('   Response is not valid JSON - production app might be serving HTML error page');
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      return;
    }

    console.log('✅ Valid JSON Response Received');
    console.log(`📊 Success: ${data.success}`);
    console.log(`📊 Data: ${JSON.stringify(data, null, 2).substring(0, 1000)}`);

    // Analyze the response like n8n would
    if (!data.success) {
      console.log('❌ API returned success: false');
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      console.log('   → This would cause "Log No Emails" in n8n');
      return;
    }

    if (!data.data || !Array.isArray(data.data)) {
      console.log('❌ No data array in response');
      console.log('   → This would cause "Log No Emails" in n8n');
      return;
    }

    if (data.data.length === 0) {
      console.log('❌ Empty data array');
      console.log('   → No campaigns found - this would cause "Log No Emails" in n8n');
      console.log('');
      console.log('🔍 Why no campaigns?');
      console.log('   1. ⏰ No campaigns are "Active" status');
      console.log('   2. 🕒 No contacts are scheduled for current time');
      console.log('   3. 🎯 Timezone filtering excluded all contacts');
      console.log('   4. 📊 Database connection issues');
      return;
    }

    const campaign = data.data[0];
    console.log('✅ Campaign Data Found:');
    console.log(`   📧 Campaign: ${campaign.name}`);
    console.log(`   🎯 Status: ${campaign.status}`);
    console.log(`   👥 Contacts: ${campaign.contacts?.length || 0}`);
    console.log(`   📨 Senders: ${campaign.senders?.length || 0}`);

    if (!campaign.contacts || campaign.contacts.length === 0) {
      console.log('❌ No contacts in campaign');
      console.log('   → This would cause "Log No Emails" in n8n');
      console.log('');
      console.log('🔍 Why no contacts?');
      console.log('   1. 📅 No prospects assigned to campaign');
      console.log('   2. ⏰ Contacts not scheduled for current time');
      console.log('   3. 🎯 All contacts already processed');
      console.log('   4. 🌐 Timezone restrictions filtering them out');
      return;
    }

    console.log('✅ Contacts Ready for Processing:');
    campaign.contacts.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.firstName} ${contact.lastName}`);
      console.log(`      📧 ${contact.email}`);
      console.log(`      📅 Scheduled: ${contact.scheduledFor}`);
    });

    console.log('');
    console.log('🎉 PRODUCTION API IS WORKING!');
    console.log('   → n8n should process these contacts');
    console.log('   → If still getting "Log No Emails", check n8n execution logs');

  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('');
    
    if (error.code === 'ENOTFOUND') {
      console.log('🚨 DNS Error: app.leadsup.io domain not found');
      console.log('   → Check if domain is configured correctly');
      console.log('   → Verify DNS settings point to your server');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🚨 Connection Refused: Server not running');
      console.log('   → Check if your app is deployed and running');
      console.log('   → Verify port and server configuration');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('🚨 Timeout: Server too slow to respond');
      console.log('   → Check server performance and load');
    }
  }
}

// Also test a simple ping to the domain
async function testDomain() {
  console.log('\\n🌐 Testing Domain Connectivity:');
  console.log('-'.repeat(30));
  
  try {
    const response = await fetch('https://app.leadsup.io', {
      method: 'HEAD',
      timeout: 5000
    });
    console.log(`✅ Domain accessible: ${response.status}`);
  } catch (error) {
    console.log(`❌ Domain issue: ${error.message}`);
  }
}

debugProductionN8N().then(() => testDomain());