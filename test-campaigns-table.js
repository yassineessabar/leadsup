// Quick test to check campaigns table structure
const testCampaignsTable = async () => {
  try {
    console.log('🧪 Testing campaigns table structure...')
    
    const response = await fetch('http://localhost:3000/api/campaigns', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.error('❌ Failed to fetch campaigns:', response.status)
      return
    }
    
    const data = await response.json()
    console.log('✅ Campaigns API response:', data)
    
    if (data.campaigns && data.campaigns.length > 0) {
      console.log('📋 Sample campaign structure:', Object.keys(data.campaigns[0]))
    }
    
  } catch (error) {
    console.error('❌ Error testing campaigns table:', error)
  }
}

testCampaignsTable()