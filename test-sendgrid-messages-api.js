const fetch = require('node-fetch');

async function testSendGridAPI() {
  console.log('🧪 Testing SendGrid Messages API...');
  
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendGridApiKey) {
    console.error('❌ SENDGRID_API_KEY not found');
    return;
  }
  
  // Test with the corrected API format
  const startDate = '2025-01-20';
  const endDate = '2025-01-25';
  const startTimestamp = new Date(startDate + 'T00:00:00Z').toISOString();
  const endTimestamp = new Date(endDate + 'T23:59:59Z').toISOString();
  
  console.log(`📅 Date range: ${startTimestamp} to ${endTimestamp}`);
  
  // Build the query filter using SendGrid's query language
  const queryFilter = `last_event_time BETWEEN TIMESTAMP "${startTimestamp}" AND TIMESTAMP "${endTimestamp}"`;
  
  const queryParams = new URLSearchParams({
    limit: '10',
    query: queryFilter
  });
  
  console.log(`🔍 Query: ${queryFilter}`);
  console.log(`📡 Full URL: https://api.sendgrid.com/v3/messages?${queryParams}`);
  
  try {
    const response = await fetch(`https://api.sendgrid.com/v3/messages?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SendGrid API error: ${response.status} ${response.statusText}`);
      console.error(`❌ Error body: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log('✅ SendGrid API Response structure:');
    console.log(`   Keys: ${Object.keys(data).join(', ')}`);
    console.log(`   Messages count: ${data.messages?.length || 0}`);
    
    if (data.messages && data.messages.length > 0) {
      console.log('📧 Sample message structure:');
      console.log(`   Message keys: ${Object.keys(data.messages[0]).join(', ')}`);
      
      if (data.messages[0].events && data.messages[0].events.length > 0) {
        console.log('📊 Sample event structure:');
        console.log(`   Event keys: ${Object.keys(data.messages[0].events[0]).join(', ')}`);
        console.log(`   Sample event: ${JSON.stringify(data.messages[0].events[0], null, 2)}`);
      } else {
        console.log('⚠️ No events found in sample message');
      }
    }
    
    // Show full response if small
    if (JSON.stringify(data).length < 2000) {
      console.log('📋 Full response:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing SendGrid API:', error.message);
  }
}

testSendGridAPI();