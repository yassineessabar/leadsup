// Simple script to list all campaigns
console.log('📋 Listing all campaigns...');

async function listCampaigns() {
  try {
    const response = await fetch('http://localhost:3000/api/campaigns');
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to fetch campaigns:', data);
      return;
    }
    
    console.log('✅ Campaign API Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data && data.data.length > 0) {
      console.log(`\n📊 Found ${data.data.length} campaigns:`);
      data.data.forEach((campaign, index) => {
        console.log(`\n${index + 1}. ${campaign.name}`);
        console.log(`   ID: ${campaign.id}`);
        console.log(`   Status: ${campaign.status}`);
        console.log(`   Type: ${campaign.type}`);
        console.log(`   Trigger: ${campaign.trigger_type}`);
      });
      
      // Test automation with the first active campaign
      const activeCampaign = data.data.find(c => c.status === 'Active');
      if (activeCampaign) {
        console.log(`\n🎯 Testing automation with active campaign: ${activeCampaign.id}`);
        await testAutomation(activeCampaign.id);
      } else {
        console.log('\n⚠️ No active campaigns found. Activate a campaign first.');
      }
    } else {
      console.log('❌ No campaigns found or API error');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testAutomation(campaignId) {
  try {
    console.log('\n🤖 Testing automation endpoint...');
    const response = await fetch('http://localhost:3000/api/campaigns/automation/process-pending', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Automation endpoint returned ${response.status}`);
      const errorData = await response.text();
      console.error('Response:', errorData);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Automation response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Automation test failed:', error);
  }
}

listCampaigns();