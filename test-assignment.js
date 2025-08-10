// Test script to verify campaign assignment functionality
// Run this in the browser console to test assignment

async function testCampaignAssignment() {
  console.log('🧪 Testing campaign assignment...')
  
  try {
    // 1. Get all prospects
    const prospectsResponse = await fetch('/api/prospects')
    const prospectsData = await prospectsResponse.json()
    console.log('📋 Available prospects:', prospectsData.prospects?.length || 0)
    
    if (!prospectsData.prospects || prospectsData.prospects.length === 0) {
      console.log('❌ No prospects found for testing')
      return
    }
    
    // 2. Get all campaigns
    const campaignsResponse = await fetch('/api/campaigns')
    const campaignsData = await campaignsResponse.json()
    console.log('📋 Available campaigns:', campaignsData.data?.length || 0)
    
    if (!campaignsData.success || !campaignsData.data || campaignsData.data.length === 0) {
      console.log('❌ No campaigns found for testing')
      return
    }
    
    // 3. Test assignment
    const testProspect = prospectsData.prospects[0]
    const testCampaign = campaignsData.data[0]
    
    console.log('🎯 Testing assignment:', {
      prospect: `${testProspect.first_name} ${testProspect.last_name}`,
      prospect_id: testProspect.id,
      campaign: testCampaign.name,
      campaign_id: testCampaign.id
    })
    
    // 4. Assign prospect to campaign
    const assignResponse = await fetch(`/api/prospects/${testProspect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: testCampaign.id }) // Campaign IDs are UUIDs (strings)
    })
    
    const assignResult = await assignResponse.json()
    console.log('📊 Assignment result:', {
      success: assignResponse.ok,
      new_campaign_id: assignResult.prospect?.campaign_id,
      expected_campaign_id: testCampaign.id
    })
    
    // 5. Verify assignment
    const verifyResponse = await fetch(`/api/prospects?campaign_id=${testCampaign.id}`)
    const verifyData = await verifyResponse.json()
    console.log('✅ Verification:', {
      prospects_found: verifyData.prospects?.length || 0,
      includes_test_prospect: verifyData.prospects?.some(p => p.id === testProspect.id)
    })
    
    console.log('🎉 Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testCampaignAssignment()