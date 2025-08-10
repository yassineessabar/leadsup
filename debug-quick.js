const baseUrl = 'http://localhost:3000';
const campaignId = 'f4bb948b-cee0-4ed7-be81-ef30810311a2';

console.log('🐛 Debugging Automation Workflow');
console.log('🎯 Campaign ID:', campaignId);
console.log('='.repeat(60));

async function checkCampaignStatus() {
  console.log('\n📋 1. CHECKING CAMPAIGN STATUS');
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch(`${baseUrl}/api/campaigns`);
    const data = await response.json();
    
    const campaign = data.data?.find(c => c.id === campaignId);
    
    if (!campaign) {
      console.error('❌ Campaign not found!');
      return false;
    }
    
    console.log(`✅ Campaign found: "${campaign.name}"`);
    console.log(`📊 Status: ${campaign.status} ${campaign.status === 'Active' ? '✅' : '❌'}`);
    console.log(`📧 Type: ${campaign.type}`);
    console.log(`🔄 Trigger: ${campaign.trigger_type}`);
    
    return campaign;
    
  } catch (error) {
    console.error('❌ Error checking campaign:', error);
    return false;
  }
}

async function checkProspects() {
  console.log('\n👥 2. CHECKING PROSPECTS');
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch(`${baseUrl}/api/prospects?campaign_id=${campaignId}`);
    const data = await response.json();
    
    console.log(`✅ Found ${data.prospects?.length || 0} prospects assigned to campaign`);
    
    if (data.prospects && data.prospects.length > 0) {
      data.prospects.slice(0, 3).forEach(prospect => {
        console.log(`  - ${prospect.first_name} ${prospect.last_name} (${prospect.email_address})`);
      });
      return data.prospects.length;
    } else {
      console.warn('⚠️ No prospects found for this campaign!');
      return 0;
    }
    
  } catch (error) {
    console.error('❌ Prospects test failed:', error);
    return 0;
  }
}

async function run() {
  const campaign = await checkCampaignStatus();
  if (!campaign) return;
  
  const prospectCount = await checkProspects();
  
  console.log('\n⚙️ 3. CHECKING CAMPAIGN COMPONENTS');
  console.log('-'.repeat(50));
  console.log('Based on the automation API code analysis, it requires ALL of:');
  console.log('');
  console.log('1. ⚙️ Campaign Settings (campaign_settings table)');
  console.log('   - daily_contacts_limit, daily_sequence_limit');
  console.log('   - active_days: ["Mon", "Tue", "Wed", "Thu", "Fri"]');
  console.log('   - sending_start_time: "09:00", sending_end_time: "17:00"');
  console.log('');
  console.log('2. 📝 Sequences (campaign_sequences table)');
  console.log('   - At least one active sequence with step_number = 1');
  console.log('   - Must have is_active = true');
  console.log('');
  console.log('3. 📧 Senders (campaign_senders table)');
  console.log('   - At least one sender with is_active = true');
  console.log('   - Must have daily_limit > 0');
  console.log('');
  console.log('🔍 ANALYSIS:');
  console.log(`✅ Campaign exists and is Active: ${campaign.status === 'Active'}`);
  console.log(`✅ Prospects assigned: ${prospectCount > 0} (${prospectCount} prospects)`);
  console.log(`❓ Campaign Settings: Unknown (likely missing)`);
  console.log(`❓ Sequences: Unknown (likely missing)`); 
  console.log(`❓ Senders: Unknown (likely missing)`);
  console.log('');
  console.log('💡 SOLUTION:');
  console.log('Go to your campaign dashboard and configure:');
  console.log('1. Settings tab - Set up sending schedule and limits');
  console.log('2. Sequences tab - Create email sequences');
  console.log('3. Senders tab - Connect email accounts');
}

run();