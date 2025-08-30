// Simple script to populate next_email_due using environment variables
console.log('🔄 Starting to populate next_email_due field...')

const fetch = require('node-fetch')

async function populateNextEmailDue() {
  try {
    // Make a request to the automation endpoint to sync timings
    console.log('📞 Calling automation sync...')
    
    const response = await fetch('http://localhost:3000/api/automation/run', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        testMode: true,
        syncTimingsOnly: true  // Special flag to only sync timings
      })
    })
    
    const result = await response.json()
    console.log('📊 Sync result:', result)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

populateNextEmailDue()