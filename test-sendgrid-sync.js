// Test script to verify SendGrid API integration
const crypto = require('crypto');

async function testSendGridSync() {
  console.log('🧪 Testing SendGrid Sync API...\n');
  
  const campaignId = 'ac2fa28f-5360-4fa2-80c6-0c3cc217785b';
  const userId = 'd155d4c2-2f06-45b7-9c90-905e3648e8df';
  
  try {
    console.log('📤 Testing sync endpoint...');
    
    const response = await fetch('http://localhost:3001/api/sendgrid/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        campaignId, 
        userId 
      })
    });
    
    const result = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${result}`);
    
    if (response.status === 200) {
      console.log('✅ Sync API working!');
      const data = JSON.parse(result);
      if (data.success && data.data?.rates) {
        console.log('📊 Metrics received:');
        console.log(`   📧 Emails Sent: ${data.data.rates.emailsSent}`);
        console.log(`   📬 Delivery Rate: ${data.data.rates.deliveryRate}%`);
        console.log(`   👀 Open Rate: ${data.data.rates.openRate}%`);
        console.log(`   🖱️ Click Rate: ${data.data.rates.clickRate}%`);
      }
    } else {
      console.log('❌ Sync API failed');
      
      // Check if it's an environment variable issue
      if (result.includes('SENDGRID_API_KEY')) {
        console.log('\n🔑 SETUP REQUIRED:');
        console.log('   Add SENDGRID_API_KEY to your .env.local file');
        console.log('   Get your API key from: https://app.sendgrid.com/settings/api_keys');
        console.log('   Example: SENDGRID_API_KEY=SG.xxxxxxxxxx');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🚀 Make sure your Next.js dev server is running:');
      console.log('   npm run dev');
    }
  }
}

testSendGridSync().catch(console.error);