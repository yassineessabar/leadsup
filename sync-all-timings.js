// Node.js script to populate timezone and next_email_due for all contacts
const http = require('http')

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data)
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/automation/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = http.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData))
        } catch (e) {
          resolve({ error: 'Invalid JSON', body: responseData })
        }
      })
    })
    
    req.on('error', (e) => {
      reject(e)
    })
    
    req.write(postData)
    req.end()
  })
}

async function syncAllTimings() {
  try {
    console.log('🔄 Running automation to populate timezone and next_email_due...')
    
    // Run automation which will auto-populate missing timings
    const result = await makeRequest({ 
      testMode: true, 
      forceUnhealthySenders: true 
    })
    
    console.log('📊 Sync result:', result)
    
    if (result.stats) {
      console.log(`✅ Processed ${result.stats.processed} contacts`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

syncAllTimings()