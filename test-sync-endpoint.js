// Test script to verify the sync-due-contacts endpoint
const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601';
const baseUrl = process.env.VERCEL_URL || 'https://your-app.vercel.app';

console.log('🧪 Testing sync-due-contacts endpoint...');
console.log(`📍 Base URL: ${baseUrl}`);
console.log(`🎯 Campaign ID: ${campaignId}`);

async function testSyncEndpoint() {
  try {
    const url = `${baseUrl}/api/automation/sync-due-contacts?campaignId=${campaignId}`;
    console.log(`🔗 Full URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success! Result:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Failed! Error:');
      console.log(errorText);
    }
  } catch (error) {
    console.error('🚨 Exception:', error);
  }
}

testSyncEndpoint();