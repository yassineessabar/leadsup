/**
 * Test Campaign Status Update
 * Debug why campaign status isn't updating in database
 */

const campaignId = 'e52a4ebf-73ea-44c8-b38d-30ee2b8108f6';
const baseUrl = 'http://localhost:3000';

async function testCampaignStatus() {
  console.log('🔧 Testing Campaign Status Update');
  console.log('=' .repeat(50));
  console.log(`Campaign ID: ${campaignId}`);
  
  try {
    // Step 1: Check current status
    console.log('\n📋 Step 1: Checking current campaign status...');
    await checkCurrentStatus();
    
    // Step 2: Test status update API
    console.log('\n🔄 Step 2: Testing status update API...');
    await testStatusUpdate();
    
    // Step 3: Verify the update worked
    console.log('\n✅ Step 3: Verifying status update...');
    await checkCurrentStatus();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkCurrentStatus() {
  try {
    // Since campaigns API requires auth, let's check via prospects
    const response = await fetch(`${baseUrl}/api/prospects`);
    const data = await response.json();
    
    if (data.prospects && data.prospects.length > 0) {
      const prospect = data.prospects[0];
      console.log(`✅ Found prospects assigned to campaign: ${prospect.campaign_id}`);
      
      if (prospect.campaign_id === campaignId) {
        console.log('✅ Campaign ID matches our test campaign');
      } else {
        console.log(`⚠️ Campaign ID mismatch - Expected: ${campaignId}, Found: ${prospect.campaign_id}`);
      }
    }
    
    // Try to check campaign directly (might fail due to auth)
    try {
      const campaignResponse = await fetch(`${baseUrl}/api/campaigns`);
      const campaignData = await campaignResponse.json();
      
      if (campaignData.success && campaignData.data) {
        const campaign = campaignData.data.find(c => c.id === campaignId);
        if (campaign) {
          console.log(`📊 Campaign Status: ${campaign.status}`);
          console.log(`📊 Campaign Name: ${campaign.name}`);
          console.log(`📊 Campaign Type: ${campaign.type}`);
        } else {
          console.log('❌ Campaign not found in campaigns table');
        }
      } else {
        console.log('⚠️ Could not fetch campaigns (likely auth issue)');
      }
    } catch (error) {
      console.log('⚠️ Could not check campaign status directly');
    }
    
  } catch (error) {
    console.error('❌ Error checking current status:', error);
  }
}

async function testStatusUpdate() {
  try {
    console.log('🔄 Attempting to update campaign status to "Active"...');
    
    const response = await fetch(`${baseUrl}/api/campaigns/${campaignId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'Active'
      })
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ Status update API call successful');
      if (result.data) {
        console.log(`✅ Updated status: ${result.data.status}`);
        console.log(`✅ Updated at: ${result.data.updated_at}`);
      }
    } else {
      console.log('❌ Status update API call failed');
      console.log(`Error: ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing status update:', error);
  }
}

// Test automation after status update
async function testAutomationAfterUpdate() {
  console.log('\n🤖 Step 4: Testing automation after status update...');
  
  try {
    const response = await fetch(`${baseUrl}/api/campaigns/automation/process-pending`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      console.log(`🎉 SUCCESS! Automation now finds ${data.data.length} campaigns ready!`);
      
      const campaign = data.data[0];
      console.log(`📋 Campaign: ${campaign.name}`);
      console.log(`📊 Status: ${campaign.status}`);
      console.log(`👥 Contacts ready: ${campaign.contacts?.length || 0}`);
      console.log(`📧 Senders available: ${campaign.senders?.length || 0}`);
      
    } else {
      console.log('⚠️ Automation still returns empty - other configuration needed');
      console.log('Missing: Settings, Sequences, or Senders');
    }
    
  } catch (error) {
    console.error('❌ Error testing automation:', error);
  }
}

// Run the test
testCampaignStatus().then(() => {
  // Test automation after status update
  testAutomationAfterUpdate();
});