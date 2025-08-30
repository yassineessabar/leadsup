// Debug SendGrid in production environment
console.log('🔍 Debugging SendGrid in production...')

// Test if we can make a simple HTTP request to check SendGrid API
const testSendGridApi = async () => {
  try {
    const response = await fetch('https://leadsup.vercel.app/api/automation/run-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.AUTOMATION_API_USERNAME}:${process.env.AUTOMATION_API_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({ testMode: true, debug: true })
    })
    
    const result = await response.json()
    console.log('🔍 Automation test result:', JSON.stringify(result, null, 2))
    
    // Also test with simulation mode explicitly
    const response2 = await fetch('https://leadsup.vercel.app/api/admin/simulation-mode', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.AUTOMATION_API_USERNAME}:${process.env.AUTOMATION_API_PASSWORD}`).toString('base64')}`
      }
    })
    
    const simResult = await response2.json()
    console.log('🧪 Simulation mode status:', simResult)
    
  } catch (error) {
    console.error('❌ Error testing automation:', error)
  }
}

testSendGridApi()