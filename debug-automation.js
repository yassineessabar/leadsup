/**
 * Debug Automation Script
 * Identifies why automation returns empty data
 */

class AutomationDebugger {
  constructor() {
    this.baseUrl = window.location.origin;
    this.campaignId = 'f4bb948b-cee0-4ed7-be81-ef30810311a2';
  }

  async runDebug() {
    console.log('🐛 Debugging Automation Workflow');
    console.log(`🎯 Campaign ID: ${this.campaignId}`);
    console.log('=' .repeat(60));
    
    try {
      await this.checkCampaignStatus();
      await this.checkCampaignSettings();
      await this.checkSequences();
      await this.checkSenders();
      await this.checkTimeConstraints();
      
      console.log('\n📋 SUMMARY & NEXT STEPS');
      console.log('=' .repeat(60));
      this.provideSolutions();
      
    } catch (error) {
      console.error('❌ Debug failed:', error);
    }
  }

  async checkCampaignStatus() {
    console.log('\n📋 1. CHECKING CAMPAIGN STATUS');
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns`);
      const data = await response.json();
      
      const campaign = data.data?.find(c => c.id === this.campaignId);
      
      if (!campaign) {
        console.error('❌ Campaign not found!');
        return;
      }
      
      console.log(`✅ Campaign found: "${campaign.name}"`);
      console.log(`📊 Status: ${campaign.status} ${campaign.status === 'Active' ? '✅' : '❌'}`);
      console.log(`📧 Type: ${campaign.type}`);
      console.log(`🔄 Trigger: ${campaign.trigger_type}`);
      
      this.campaignData = campaign;
      
    } catch (error) {
      console.error('❌ Error checking campaign:', error);
    }
  }

  async checkCampaignSettings() {
    console.log('\n⚙️ 2. CHECKING CAMPAIGN SETTINGS');
    console.log('-'.repeat(50));
    
    // The automation requires campaign_settings table
    // Since we can't directly query it, let's simulate what should be there
    console.log('⚠️ Campaign Settings Status: UNKNOWN');
    console.log('📝 Required settings:');
    console.log('   - daily_contacts_limit (e.g., 35)');
    console.log('   - daily_sequence_limit (e.g., 100)');
    console.log('   - active_days (e.g., ["Mon", "Tue", "Wed", "Thu", "Fri"])');
    console.log('   - sending_start_time (e.g., "09:00")');
    console.log('   - sending_end_time (e.g., "17:00")');
    
    console.log('\n🔍 These should be configured in campaign dashboard settings tab');
  }

  async checkSequences() {
    console.log('\n📝 3. CHECKING SEQUENCES');
    console.log('-'.repeat(50));
    
    // The automation requires campaign_sequences table
    console.log('⚠️ Sequences Status: UNKNOWN');
    console.log('📝 Required sequences:');
    console.log('   - At least one active sequence with step_number = 1');
    console.log('   - Subject and content templates');
    console.log('   - Timing configuration');
    
    console.log('\n🔍 These should be configured in campaign dashboard sequences tab');
  }

  async checkSenders() {
    console.log('\n📧 4. CHECKING SENDERS');
    console.log('-'.repeat(50));
    
    // The automation requires campaign_senders table
    console.log('⚠️ Senders Status: UNKNOWN');
    console.log('📝 Required senders:');
    console.log('   - At least one active sender (is_active = true)');
    console.log('   - Valid email credentials (Gmail/Outlook/SMTP)');
    console.log('   - Daily limit configuration');
    console.log('   - Health score tracking');
    
    console.log('\n🔍 These should be configured in campaign dashboard senders tab');
  }

  async checkTimeConstraints() {
    console.log('\n⏰ 5. CHECKING TIME CONSTRAINTS');
    console.log('-'.repeat(50));
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en', { weekday: 'short' });
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`📅 Current day: ${currentDay}`);
    console.log(`🕐 Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
    
    // Typical business constraints
    const businessDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const businessHours = currentHour >= 9 && currentHour < 17;
    
    console.log(`📊 Is business day: ${businessDays.includes(currentDay) ? '✅' : '❌'}`);
    console.log(`📊 Is business hours: ${businessHours ? '✅' : '❌'}`);
    
    if (!businessDays.includes(currentDay)) {
      console.log('⚠️ Today is not a typical business day (weekends are usually inactive)');
    }
    
    if (!businessHours) {
      console.log('⚠️ Current time is outside typical business hours (9 AM - 5 PM)');
    }
  }

  provideSolutions() {
    console.log('🔧 LIKELY ISSUES & SOLUTIONS:');
    console.log('');
    
    console.log('1. 🚫 Campaign not Active:');
    console.log('   → Go to campaign list and click Play button (▶️)');
    console.log('');
    
    console.log('2. ⚙️ Missing Campaign Settings:');
    console.log('   → Go to campaign dashboard → Settings tab');
    console.log('   → Configure daily limits and sending schedule');
    console.log('');
    
    console.log('3. 📝 Missing Sequences:');
    console.log('   → Go to campaign dashboard → Sequences tab');
    console.log('   → Create at least one email sequence');
    console.log('');
    
    console.log('4. 📧 Missing Senders:');
    console.log('   → Go to campaign dashboard → Senders tab');
    console.log('   → Connect Gmail/Outlook accounts');
    console.log('');
    
    console.log('5. ⏰ Time Constraints:');
    console.log('   → Check if current time is within business hours');
    console.log('   → Verify today is an active day');
    console.log('');
    
    console.log('💡 QUICK TEST:');
    console.log('After fixing the above, run this again:');
    console.log(`curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \\`);
    console.log(`  -H "Authorization: Basic $(echo -n 'admin:password' | base64)"`);
  }
}

// Run the debugger
const debugger = new AutomationDebugger();
debugger.runDebug();