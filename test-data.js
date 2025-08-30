// Test to see what data we have
const fetch = require('node-fetch')

async function testData() {
  try {
    console.log('🔍 Testing what data is available...')
    
    // Test if we can reach the server
    const testResponse = await fetch('http://localhost:3000/api/automation/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ testMode: true, debug: true })
    })
    
    console.log('📊 Response status:', testResponse.status)
    const result = await testResponse.text()
    console.log('📧 Response body:', result.substring(0, 500))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testData()