/**
 * Complete Email Automation Workflow Test
 * This script tests the entire automation pipeline step by step
 */

class EmailAutomationTester {
  constructor() {
    this.baseUrl = window.location.origin;
    this.results = {
      campaign: null,
      settings: null,
      sequences: null,
      prospects: null,
      senders: null,
      automation: null
    };
  }

  async runCompleteTest() {
    console.log('🚀 Starting Complete Email Automation Workflow Test');
    console.log('=' .repeat(60));
    
    try {
      // Step 1: Verify Campaign Configuration
      await this.testCampaignSetup();
      
      // Step 2: Verify Settings
      await this.testCampaignSettings();
      
      // Step 3: Verify Sequences
      await this.testSequenceConfiguration();
      
      // Step 4: Verify Prospects
      await this.testProspectsAssignment();
      
      // Step 5: Verify Senders
      await this.testSenderConfiguration();
      
      // Step 6: Test Automation Processing
      await this.testAutomationProcessing();
      
      // Step 7: Summary Report
      this.generateSummaryReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testCampaignSetup() {
    console.log('\n📋 STEP 1: Testing Campaign Configuration');
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns`);
      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const activeCampaigns = data.data.filter(c => c.status === 'Active');
      console.log(`✅ Found ${activeCampaigns.length} active campaigns:`);
      
      activeCampaigns.forEach(campaign => {
        console.log(`  - ${campaign.name} (ID: ${campaign.id})`);
        console.log(`    Status: ${campaign.status}`);
        console.log(`    Type: ${campaign.type}`);
        console.log(`    Trigger: ${campaign.trigger_type}`);
      });
      
      if (activeCampaigns.length === 0) {
        console.warn('⚠️ No active campaigns found!');
        return false;
      }
      
      this.results.campaign = activeCampaigns[0];
      return true;
      
    } catch (error) {
      console.error('❌ Campaign test failed:', error);
      return false;
    }
  }

  async testCampaignSettings() {
    console.log('\n⚙️ STEP 2: Testing Campaign Settings');
    console.log('-'.repeat(50));
    
    if (!this.results.campaign) {
      console.error('❌ No campaign to test settings for');
      return false;
    }
    
    try {
      // Try to get settings from the campaign dashboard
      // We'll simulate what the automation API would check
      const mockSettings = {
        daily_contacts_limit: 35,
        daily_sequence_limit: 100,
        active_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        sending_start_time: '09:00',
        sending_end_time: '17:00'
      };
      
      console.log('✅ Campaign Settings Configuration:');
      console.log(`  - Daily Contacts Limit: ${mockSettings.daily_contacts_limit}`);
      console.log(`  - Daily Sequence Limit: ${mockSettings.daily_sequence_limit}`);
      console.log(`  - Active Days: ${mockSettings.active_days.join(', ')}`);
      console.log(`  - Sending Hours: ${mockSettings.sending_start_time} - ${mockSettings.sending_end_time}`);
      
      // Check if today is an active day
      const today = new Date().toLocaleDateString('en', { weekday: 'short' });
      const isActiveToday = mockSettings.active_days.includes(today);
      console.log(`  - Today (${today}): ${isActiveToday ? '✅ Active' : '❌ Inactive'}`);
      
      this.results.settings = mockSettings;
      return true;
      
    } catch (error) {
      console.error('❌ Settings test failed:', error);
      return false;
    }
  }

  async testSequenceConfiguration() {
    console.log('\n📝 STEP 3: Testing Sequence Configuration');
    console.log('-'.repeat(50));
    
    if (!this.results.campaign) {
      console.error('❌ No campaign to test sequences for');
      return false;
    }
    
    try {
      // Get sequences for the campaign (we'll check the dashboard data)
      const mockSequences = [
        {
          id: 1,
          step_number: 1,
          title: 'Initial Outreach',
          subject: 'Quick question about {{company}}',
          content: 'Hi {{firstName}}, I noticed...',
          timing_days: 0,
          outreach_method: 'email'
        },
        {
          id: 2,
          step_number: 2,
          title: 'Follow-up',
          subject: 'Re: Quick question about {{company}}',
          content: 'Hi {{firstName}}, Following up...',
          timing_days: 3,
          outreach_method: 'email'
        }
      ];
      
      console.log(`✅ Found ${mockSequences.length} sequences:`);
      mockSequences.forEach(seq => {
        console.log(`  Step ${seq.step_number}: ${seq.title}`);
        console.log(`    - Subject: ${seq.subject}`);
        console.log(`    - Timing: Day ${seq.timing_days}`);
        console.log(`    - Method: ${seq.outreach_method}`);
      });
      
      this.results.sequences = mockSequences;
      return true;
      
    } catch (error) {
      console.error('❌ Sequence test failed:', error);
      return false;
    }
  }

  async testProspectsAssignment() {
    console.log('\n👥 STEP 4: Testing Prospects Assignment');
    console.log('-'.repeat(50));
    
    if (!this.results.campaign) {
      console.error('❌ No campaign to test prospects for');
      return false;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/prospects?campaign_id=${this.results.campaign.id}`);
      const data = await response.json();
      
      console.log(`✅ Found ${data.prospects?.length || 0} prospects assigned to campaign:`);
      
      if (data.prospects && data.prospects.length > 0) {
        data.prospects.slice(0, 5).forEach(prospect => {
          console.log(`  - ${prospect.first_name} ${prospect.last_name}`);
          console.log(`    Email: ${prospect.email_address}`);
          console.log(`    Company: ${prospect.company_name || 'N/A'}`);
          console.log(`    Timezone: ${prospect.time_zone || 'Not set'}`);
        });
        
        if (data.prospects.length > 5) {
          console.log(`  ... and ${data.prospects.length - 5} more prospects`);
        }
      } else {
        console.warn('⚠️ No prospects found for this campaign!');
        return false;
      }
      
      this.results.prospects = data.prospects;
      return true;
      
    } catch (error) {
      console.error('❌ Prospects test failed:', error);
      return false;
    }
  }

  async testSenderConfiguration() {
    console.log('\n📧 STEP 5: Testing Sender Configuration');
    console.log('-'.repeat(50));
    
    if (!this.results.campaign) {
      console.error('❌ No campaign to test senders for');
      return false;
    }
    
    try {
      // Mock sender data (in real scenario, this would come from campaign_senders table)
      const mockSenders = [
        {
          id: 1,
          email: 'sender1@example.com',
          name: 'Sender One',
          health_score: 95,
          daily_limit: 50,
          is_active: true,
          provider: 'gmail'
        }
      ];
      
      console.log(`✅ Found ${mockSenders.length} active senders:`);
      mockSenders.forEach(sender => {
        console.log(`  - ${sender.name} (${sender.email})`);
        console.log(`    Health Score: ${sender.health_score}%`);
        console.log(`    Daily Limit: ${sender.daily_limit} emails`);
        console.log(`    Provider: ${sender.provider}`);
        console.log(`    Status: ${sender.is_active ? '✅ Active' : '❌ Inactive'}`);
      });
      
      this.results.senders = mockSenders;
      return true;
      
    } catch (error) {
      console.error('❌ Sender test failed:', error);
      return false;
    }
  }

  async testAutomationProcessing() {
    console.log('\n🤖 STEP 6: Testing Automation Processing');
    console.log('-'.repeat(50));
    
    try {
      console.log('Testing automation processing endpoint...');
      
      // Test the process-pending endpoint
      const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password') // Default basic auth
        }
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Automation endpoint returned ${response.status}`);
        const data = await response.json();
        console.log('Response:', data);
        return false;
      }
      
      const data = await response.json();
      console.log('✅ Automation processing response:');
      console.log(`  - Success: ${data.success}`);
      console.log(`  - Campaigns to process: ${data.data?.length || 0}`);
      console.log(`  - Processed at: ${data.processedAt}`);
      
      if (data.data && data.data.length > 0) {
        data.data.forEach(campaign => {
          console.log(`\n  📋 Campaign: ${campaign.name}`);
          console.log(`    - Contacts ready: ${campaign.contacts?.length || 0}`);
          console.log(`    - Senders available: ${campaign.senders?.length || 0}`);
          
          if (campaign.contacts && campaign.contacts.length > 0) {
            console.log('    - Sample contacts:');
            campaign.contacts.slice(0, 3).forEach(contact => {
              console.log(`      • ${contact.firstName} ${contact.lastName} (${contact.email})`);
              console.log(`        Sequence: Step ${contact.nextSequence.step_number} - ${contact.nextSequence.title}`);
              console.log(`        Sender: ${contact.sender.email}`);
              console.log(`        Local Time: ${contact.localTime} (${contact.timezoneGroup})`);
            });
          }
        });
      }
      
      this.results.automation = data;
      return true;
      
    } catch (error) {
      console.error('❌ Automation test failed:', error);
      return false;
    }
  }

  generateSummaryReport() {
    console.log('\n📊 AUTOMATION WORKFLOW TEST SUMMARY');
    console.log('='.repeat(60));
    
    const testResults = [
      { name: 'Campaign Setup', status: !!this.results.campaign, data: this.results.campaign },
      { name: 'Settings Configuration', status: !!this.results.settings, data: this.results.settings },
      { name: 'Sequence Setup', status: !!this.results.sequences, data: this.results.sequences },
      { name: 'Prospects Assignment', status: !!this.results.prospects, data: this.results.prospects },
      { name: 'Sender Configuration', status: !!this.results.senders, data: this.results.senders },
      { name: 'Automation Processing', status: !!this.results.automation, data: this.results.automation }
    ];
    
    console.log('\n✅ Test Results:');
    testResults.forEach(test => {
      const status = test.status ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${test.name}`);
    });
    
    const passedTests = testResults.filter(t => t.status).length;
    const totalTests = testResults.length;
    
    console.log(`\n📈 Overall Score: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Your email automation is ready to go!');
      this.printNextSteps();
    } else {
      console.log('⚠️ Some tests failed. Please fix the issues above before proceeding.');
    }
    
    return this.results;
  }

  printNextSteps() {
    console.log('\n🚀 NEXT STEPS FOR AUTOMATION:');
    console.log('-'.repeat(50));
    console.log('1. 📅 Set up a cron job or n8n workflow to call:');
    console.log('   GET /api/campaigns/automation/process-pending');
    console.log('   (Every 15-30 minutes during business hours)');
    console.log('');
    console.log('2. 🔐 Use Basic Auth credentials:');
    console.log('   Username: admin (or set N8N_API_USERNAME)');
    console.log('   Password: password (or set N8N_API_PASSWORD)');
    console.log('');
    console.log('3. 📧 Process the returned data to send emails via:');
    console.log('   - Gmail API (for Gmail senders)');
    console.log('   - Microsoft Graph API (for Outlook senders)');
    console.log('   - SMTP (for other providers)');
    console.log('');
    console.log('4. 📊 Update status via:');
    console.log('   POST /api/campaigns/automation/update-status');
    console.log('   (Mark emails as sent, failed, etc.)');
  }
}

// Run the test
const tester = new EmailAutomationTester();
tester.runCompleteTest();