/**
 * Complete Start-to-End Test Workflow
 * Systematic testing of the entire email automation pipeline
 */

class FullWorkflowTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.campaignId = 'f4bb948b-cee0-4ed7-be81-ef30810311a2';
  }

  async runFullTest() {
    console.log('🔄 COMPLETE START-TO-END AUTOMATION TEST');
    console.log('=' .repeat(60));
    
    try {
      await this.step1_CheckCampaigns();
      await this.step2_CheckProspects();
      await this.step3_CheckAutomation();
      await this.step4_RunEmailSending();
      await this.step5_VerifyResults();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async step1_CheckCampaigns() {
    console.log('\n📋 STEP 1: Checking Campaign Status');
    console.log('-'.repeat(50));
    
    // Check if campaigns exist
    const response = await fetch(`${this.baseUrl}/api/campaigns`);
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      console.log(`✅ Found ${data.data.length} campaigns`);
      
      const targetCampaign = data.data.find(c => c.id === this.campaignId);
      if (targetCampaign) {
        console.log(`✅ Target campaign found: "${targetCampaign.name}"`);
        console.log(`   Status: ${targetCampaign.status}`);
        console.log(`   Type: ${targetCampaign.type}`);
      } else {
        console.error('❌ Target campaign not found!');
        console.log('Available campaigns:');
        data.data.forEach(c => console.log(`   - ${c.name} (${c.id})`));
      }
    } else {
      console.error('❌ No campaigns found or API error:', data);
    }
  }

  async step2_CheckProspects() {
    console.log('\n👥 STEP 2: Checking Prospects');
    console.log('-'.repeat(50));
    
    const response = await fetch(`${this.baseUrl}/api/prospects?campaign_id=${this.campaignId}`);
    const data = await response.json();
    
    if (data.prospects && data.prospects.length > 0) {
      console.log(`✅ Found ${data.prospects.length} prospects assigned to campaign:`);
      data.prospects.forEach(p => {
        console.log(`   - ${p.first_name} ${p.last_name} (${p.email_address.trim()})`);
        console.log(`     Timezone: ${p.time_zone}`);
        console.log(`     Opted out: ${p.opted_out}`);
      });
    } else {
      console.error('❌ No prospects found for campaign!');
    }
  }

  async step3_CheckAutomation() {
    console.log('\n🤖 STEP 3: Testing Automation Endpoint');
    console.log('-'.repeat(50));
    
    const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    });
    
    const data = await response.json();
    
    console.log('Automation Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data.length > 0) {
      console.log(`✅ ${data.data.length} campaigns ready for processing`);
      
      const campaign = data.data[0];
      console.log(`Campaign: ${campaign.name}`);
      console.log(`Contacts ready: ${campaign.contacts?.length || 0}`);
      console.log(`Senders available: ${campaign.senders?.length || 0}`);
      
      if (campaign.contacts && campaign.contacts.length > 0) {
        console.log('Sample contact ready for email:');
        const contact = campaign.contacts[0];
        console.log(`   ${contact.firstName} ${contact.lastName} (${contact.email.trim()})`);
        console.log(`   Sequence: ${contact.nextSequence.title} (Step ${contact.nextSequence.step_number})`);
        console.log(`   Sender: ${contact.sender.name} (${contact.sender.email})`);
        console.log(`   Local time: ${contact.localTime}`);
      }
      
      return data.data;
    } else {
      console.error('❌ No campaigns ready for processing');
      console.log('This could be due to:');
      console.log('   - Time restrictions (outside sending hours)');
      console.log('   - Missing campaign settings');
      console.log('   - Missing sequences');  
      console.log('   - Missing senders');
      console.log('   - All prospects already processed today');
      
      return [];
    }
  }

  async step4_RunEmailSending() {
    console.log('\n📧 STEP 4: Running Email Automation');
    console.log('-'.repeat(50));
    
    // This would typically be done by the email-sender.js script
    // For now, let's simulate the process
    
    console.log('To run actual email sending:');
    console.log('   node email-sender.js');
    console.log('');
    console.log('This will:');
    console.log('   1. Fetch pending contacts from automation API');
    console.log('   2. Send emails via Gmail API');
    console.log('   3. Update status in database');
    console.log('   4. Schedule next sequence steps');
  }

  async step5_VerifyResults() {
    console.log('\n📊 STEP 5: Verifying Results');
    console.log('-'.repeat(50));
    
    console.log('To check results, query these database tables:');
    console.log('');
    console.log('1. contact_sequences - Email send status:');
    console.log('   SELECT contact_id, sequence_id, status, sent_at, sender_account');
    console.log('   FROM contact_sequences');
    console.log('   WHERE status = \'sent\'');
    console.log('   ORDER BY sent_at DESC;');
    console.log('');
    console.log('2. campaigns - Summary statistics:');
    console.log('   SELECT name, emails_sent, emails_failed, emails_pending');
    console.log('   FROM campaigns');
    console.log(`   WHERE id = '${this.campaignId}';`);
    console.log('');
    
    // Try to get campaign stats if available
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns`);
      const data = await response.json();
      
      if (data.success) {
        const campaign = data.data?.find(c => c.id === this.campaignId);
        if (campaign) {
          console.log('Current campaign stats:');
          console.log(`   Emails sent: ${campaign.emails_sent || 0}`);
          console.log(`   Emails failed: ${campaign.emails_failed || 0}`);
          console.log(`   Emails pending: ${campaign.emails_pending || 0}`);
        }
      }
    } catch (error) {
      console.log('Could not fetch current stats');
    }
  }
}

// Run the test
const tester = new FullWorkflowTester();
tester.runFullTest();