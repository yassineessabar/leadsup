// Test script to understand what the campaign senders API returns
const testCampaignSendersAPI = async () => {
  try {
    console.log('🧪 Testing campaign senders API...')
    
    // Test the specific campaign from the error log
    const campaignId = '03655daa-4434-4f45-97e0-6b0518aabf8b'
    
    const response = await fetch(`http://localhost:3008/api/campaigns/${campaignId}/senders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('📡 Response status:', response.status)
    
    if (!response.ok) {
      console.error('❌ Failed to fetch campaign senders:', response.status)
      const errorText = await response.text()
      console.error('Error text:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('✅ Campaign senders API response:', JSON.stringify(data, null, 2))
    
    if (data.assignments) {
      console.log('📋 Assignments found:')
      data.assignments.forEach((assignment, index) => {
        console.log(`  ${index + 1}. Assignment:`, assignment)
        console.log(`     - sender_account_id: ${assignment.sender_account_id}`)
        console.log(`     - sender_id: ${assignment.sender_id}`)
        console.log(`     - id: ${assignment.id}`)
        console.log(`     - email: ${assignment.email}`)
        console.log(`     - Available keys:`, Object.keys(assignment))
      })
    } else {
      console.log('❌ No assignments found in response')
    }
    
  } catch (error) {
    console.error('❌ Error testing campaign senders API:', error)
  }
}

testCampaignSendersAPI()