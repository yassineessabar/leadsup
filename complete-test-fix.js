/**
 * Complete Test with Auto-Fix
 * Identifies issues and provides solutions for end-to-end testing
 */

class CompleteTestFix {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async runCompleteTest() {
    console.log('🔧 COMPLETE TEST WITH AUTO-DIAGNOSIS');
    console.log('=' .repeat(60));
    
    try {
      // Step 1: Find actual campaign ID from prospects
      const actualCampaignId = await this.findActiveCampaignId();
      
      if (!actualCampaignId) {
        console.error('❌ No campaign ID found from prospects!');
        return;
      }
      
      console.log(`🎯 Using campaign ID: ${actualCampaignId}`);
      
      // Step 2: Test automation with correct ID
      await this.testAutomation(actualCampaignId);
      
      // Step 3: If automation works, run email sender
      await this.testEmailSending();
      
      // Step 4: Provide next steps
      this.provideNextSteps();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async findActiveCampaignId() {
    console.log('\n🔍 Finding active campaign ID from prospects...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/prospects`);
      const data = await response.json();
      
      if (data.prospects && data.prospects.length > 0) {
        const campaignId = data.prospects[0].campaign_id;
        console.log(`✅ Found campaign ID from prospects: ${campaignId}`);
        console.log(`📊 Prospects assigned: ${data.prospects.length}`);
        
        // Show prospect details
        data.prospects.forEach((p, index) => {
          console.log(`   ${index + 1}. ${p.first_name} ${p.last_name} (${p.email_address.trim()})`);
        });
        
        return campaignId;
      } else {
        console.error('❌ No prospects found!');
        return null;
      }
    } catch (error) {
      console.error('❌ Error finding campaign ID:', error);
      return null;
    }
  }

  async testAutomation(campaignId) {
    console.log('\\n🤖 Testing automation endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        console.log(`✅ AUTOMATION WORKING! Found ${data.data.length} campaigns ready`);
        
        const campaign = data.data[0];
        console.log(`📋 Campaign: ${campaign.name}`);
        console.log(`👥 Contacts ready: ${campaign.contacts?.length || 0}`);
        console.log(`📧 Senders available: ${campaign.senders?.length || 0}`);
        
        if (campaign.contacts && campaign.contacts.length > 0) {
          console.log('\\n📧 Ready to send emails:');
          campaign.contacts.forEach((contact, index) => {
            console.log(`   ${index + 1}. ${contact.firstName} ${contact.lastName}`);
            console.log(`      Email: ${contact.email.trim()}`);
            console.log(`      Sequence: ${contact.nextSequence.title}`);
            console.log(`      Sender: ${contact.sender.name} (${contact.sender.email})`);
            console.log(`      Time: ${contact.localTime}`);
            console.log('');
          });
          
          return true;
        }
      } else {
        console.log('❌ Automation returned empty data');
        console.log('Full response:', JSON.stringify(data, null, 2));
        
        console.log('\\n🔧 TROUBLESHOOTING:');
        console.log('The campaign likely needs configuration:');
        console.log('1. Go to your campaign dashboard');
        console.log('2. Make sure campaign is ACTIVE');
        console.log('3. Configure Settings tab (sending schedule)');
        console.log('4. Create Sequences tab (email templates)');
        console.log('5. Connect Senders tab (Gmail accounts)');
        
        return false;
      }
    } catch (error) {
      console.error('❌ Automation test failed:', error);
      return false;
    }
  }

  async testEmailSending() {
    console.log('\\n📤 Testing email sending...');
    
    console.log('To run the actual email sender:');
    console.log('   node email-sender.js');
    console.log('');
    console.log('This will:');
    console.log('✅ Fetch contacts from automation API');
    console.log('📧 Send emails via Gmail API');
    console.log('📊 Update status in database');
    console.log('⏭️ Schedule next sequence steps');
  }

  provideNextSteps() {
    console.log('\\n🎯 NEXT STEPS FOR COMPLETE TEST:');
    console.log('=' .repeat(50));
    console.log('');
    console.log('1. 🔧 If automation is working:');
    console.log('   → Run: node email-sender.js');
    console.log('   → This will send actual emails');
    console.log('');
    console.log('2. 🔧 If automation returns empty:');
    console.log('   → Go to campaign dashboard');
    console.log('   → Ensure campaign is Active');
    console.log('   → Configure all required tabs');
    console.log('');
    console.log('3. 📊 Check results after sending:');
    console.log('   → Query contact_sequences table');
    console.log('   → Check campaign statistics');
    console.log('   → Monitor Gmail sent folder');
    console.log('');
    console.log('4. 🔄 For production:');
    console.log('   → Schedule automation every 15-30 minutes');
    console.log('   → Monitor token expiration');
    console.log('   → Set up error alerts');
  }
}

// Run the complete test
const tester = new CompleteTestFix();
tester.runCompleteTest();