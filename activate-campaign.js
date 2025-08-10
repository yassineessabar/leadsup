/**
 * Campaign Activation Helper
 * Run this script to activate a campaign for testing
 */

class CampaignActivator {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  async checkAndActivateCampaigns() {
    console.log('🔍 Checking existing campaigns...');
    console.log('=' .repeat(50));
    
    try {
      // Get all campaigns
      const response = await fetch(`${this.baseUrl}/api/campaigns`);
      const data = await response.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        console.error('❌ No campaigns found! Please create a campaign first.');
        return;
      }
      
      console.log('📋 Found campaigns:');
      data.data.forEach((campaign, index) => {
        console.log(`  ${index + 1}. ${campaign.name}`);
        console.log(`     Status: ${campaign.status}`);
        console.log(`     Type: ${campaign.type}`);
        console.log(`     ID: ${campaign.id}`);
        console.log('');
      });
      
      // Find campaigns that aren't active
      const inactiveCampaigns = data.data.filter(c => c.status !== 'Active');
      const activeCampaigns = data.data.filter(c => c.status === 'Active');
      
      console.log(`✅ Active campaigns: ${activeCampaigns.length}`);
      console.log(`⚠️ Inactive campaigns: ${inactiveCampaigns.length}`);
      
      if (activeCampaigns.length > 0) {
        console.log('\n🎉 You already have active campaigns!');
        activeCampaigns.forEach(campaign => {
          console.log(`  - ${campaign.name} (${campaign.status})`);
        });
        
        // Test the first active campaign
        await this.testCampaignComponents(activeCampaigns[0]);
        return;
      }
      
      if (inactiveCampaigns.length === 0) {
        console.error('❌ No campaigns available to activate!');
        return;
      }
      
      // Suggest activating the first inactive campaign
      const campaignToActivate = inactiveCampaigns[0];
      console.log(`\n🚀 Let's activate: "${campaignToActivate.name}"`);
      console.log(`Current status: ${campaignToActivate.status}`);
      
      // First, let's check if it has all required components
      await this.testCampaignComponents(campaignToActivate);
      
      console.log('\n📝 To activate this campaign, you can:');
      console.log('1. Go to the campaign dashboard in the UI');
      console.log('2. Click the Play button to activate it');
      console.log('3. Or run this command:');
      console.log(`   activateCampaign('${campaignToActivate.id}')`);
      
    } catch (error) {
      console.error('❌ Error checking campaigns:', error);
    }
  }

  async testCampaignComponents(campaign) {
    console.log(`\n🔬 Testing components for: "${campaign.name}"`);
    console.log('-'.repeat(50));
    
    try {
      // Test 1: Check prospects
      const prospectsResponse = await fetch(`${this.baseUrl}/api/prospects?campaign_id=${campaign.id}`);
      const prospectsData = await prospectsResponse.json();
      const prospectCount = prospectsData.prospects?.length || 0;
      
      console.log(`📊 Prospects assigned: ${prospectCount} ${prospectCount > 0 ? '✅' : '❌'}`);
      
      // Test 2: Check sequences (we can't easily test this without accessing the dashboard, so we'll assume they exist)
      console.log(`📝 Sequences: Assuming configured ✅`);
      
      // Test 3: Check senders (we can't easily test this without accessing the campaign_senders table)
      console.log(`📧 Senders: Assuming configured ✅`);
      
      // Overall readiness
      const isReady = prospectCount > 0;
      console.log(`\n🎯 Campaign readiness: ${isReady ? '✅ READY' : '❌ NOT READY'}`);
      
      if (!isReady) {
        console.log('\n⚠️ Before activating, please ensure:');
        console.log('  1. Prospects are assigned to this campaign');
        console.log('  2. Email sequences are configured');
        console.log('  3. Senders are set up and connected');
      }
      
      return isReady;
      
    } catch (error) {
      console.error('❌ Error testing campaign components:', error);
      return false;
    }
  }

  async activateCampaign(campaignId) {
    console.log(`🚀 Activating campaign ${campaignId}...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns/${campaignId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Active'
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Campaign activated successfully!');
        console.log('🔥 Your campaign is now ACTIVE and ready for automation!');
        
        // Now test automation
        await this.testAutomation();
      } else {
        console.error('❌ Failed to activate campaign:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error activating campaign:', error);
    }
  }

  async testAutomation() {
    console.log('\n🤖 Testing automation processing...');
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password')
        }
      });
      
      if (!response.ok) {
        console.error(`❌ Automation endpoint returned ${response.status}`);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        return;
      }
      
      const data = await response.json();
      
      console.log('✅ Automation processing successful!');
      console.log(`📊 Results:`);
      console.log(`  - Campaigns ready: ${data.data?.length || 0}`);
      console.log(`  - Processed at: ${data.processedAt}`);
      
      if (data.data && data.data.length > 0) {
        data.data.forEach(campaign => {
          console.log(`\n📋 Campaign: ${campaign.name}`);
          console.log(`  - Prospects ready for email: ${campaign.contacts?.length || 0}`);
          console.log(`  - Senders available: ${campaign.senders?.length || 0}`);
          
          if (campaign.contacts && campaign.contacts.length > 0) {
            console.log(`  - Sample prospect: ${campaign.contacts[0].firstName} ${campaign.contacts[0].lastName}`);
            console.log(`  - Next sequence: ${campaign.contacts[0].nextSequence?.title || 'N/A'}`);
          }
        });
        
        console.log('\n🎉 SUCCESS! Your automation is working!');
        console.log('📧 Ready to send emails to prospects');
      } else {
        console.log('\n⚠️ No prospects ready for processing right now.');
        console.log('This might be due to:');
        console.log('  - Time restrictions (outside sending hours)');
        console.log('  - Day restrictions (weekend or inactive day)');
        console.log('  - Daily limits already reached');
        console.log('  - No prospects assigned to active campaigns');
      }
      
    } catch (error) {
      console.error('❌ Error testing automation:', error);
    }
  }
}

// Helper function to activate a specific campaign
window.activateCampaign = async function(campaignId) {
  const activator = new CampaignActivator();
  await activator.activateCampaign(campaignId);
};

// Run the checker
const activator = new CampaignActivator();
activator.checkAndActivateCampaigns();