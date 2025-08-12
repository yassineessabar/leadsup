// Test script to check domains API endpoint
const fetch = require('node-fetch');

async function testDomainsAPI() {
  try {
    console.log('Testing domains API...');
    
    // Test GET domains endpoint
    const response = await fetch('http://localhost:3004/api/domains', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log('GET /api/domains response:', response.status, data);
    
    // Test POST domains endpoint (without auth, should fail with 401)
    const postResponse = await fetch('http://localhost:3004/api/domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'test.com',
        verificationType: 'manual'
      })
    });
    
    const postData = await postResponse.json();
    console.log('POST /api/domains response:', postResponse.status, postData);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDomainsAPI();