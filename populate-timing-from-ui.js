// Simple Node.js script to call the UI's analytics endpoint and extract next_email_due values
const fetch = require('node-fetch')

async function extractTimingFromUI() {
  try {
    console.log('🔍 Calling UI analytics to get calculated timings...')
    
    // Call the analytics endpoint which has all the UI timing logic
    const response = await fetch('http://localhost:3000/api/campaigns/ed08e451-55a7-4118-b69e-de13858034f6/analytics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=demo-session' // Try with demo session
      }
    })
    
    if (!response.ok) {
      console.log('❌ Analytics call failed:', response.status)
      const text = await response.text()
      console.log('Response:', text.substring(0, 200))
      return
    }
    
    const data = await response.json()
    console.log('📊 Got analytics data:', Object.keys(data))
    
    // Look for contacts with "Due next" status
    if (data.contacts) {
      const dueNextContacts = data.contacts.filter(c => c.nextEmailIn === 'Due next')
      console.log(`📧 Found ${dueNextContacts.length} "Due next" contacts:`)
      
      for (const contact of dueNextContacts) {
        console.log(`  - ${contact.email}: next_scheduled = ${contact.next_scheduled}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

extractTimingFromUI()