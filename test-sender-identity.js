// Test SendGrid Sender Identity creation
import { createSenderIdentity } from './lib/sendgrid.js'

async function testSenderIdentity() {
  try {
    console.log('🧪 Testing SendGrid Sender Identity creation...')
    
    const result = await createSenderIdentity({
      nickname: 'Test Sender - example.com',
      from: {
        email: 'test@example.com',
        name: 'Test Sender'
      },
      reply_to: {
        email: 'test@example.com',
        name: 'Test Sender'
      },
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'United States'
    })
    
    console.log('✅ Test successful:', result)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSenderIdentity()