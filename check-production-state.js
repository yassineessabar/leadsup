const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProductionState() {
  try {
    console.log('🔍 Checking production database state...\n');
    
    // Check campaigns
    console.log('1. CAMPAIGNS:');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status, settings')
      .eq('status', 'Active');
    
    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError);
      return;
    }
    
    console.log(`   Found ${campaigns?.length || 0} active campaigns:`);
    campaigns?.forEach((campaign, index) => {
      console.log(`   ${index + 1}. ${campaign.name} (${campaign.id}) - Auto Warmup: ${campaign.settings?.auto_warmup || false}`);
    });
    
    // Check senders for each campaign
    console.log('\n2. CAMPAIGN SENDERS:');
    for (const campaign of campaigns || []) {
      console.log(`\n   Campaign: ${campaign.name}`);
      
      const { data: allSenders, error: allSendersError } = await supabase
        .from('campaign_senders')
        .select('email, is_selected, is_active, warmup_status, health_score')
        .eq('campaign_id', campaign.id);
      
      if (allSendersError) {
        console.error(`   ❌ Error fetching senders for ${campaign.name}:`, allSendersError);
        continue;
      }
      
      console.log(`   Total senders: ${allSenders?.length || 0}`);
      
      const selectedSenders = allSenders?.filter(s => s.is_selected) || [];
      console.log(`   Selected senders: ${selectedSenders.length}`);
      
      selectedSenders.forEach((sender, index) => {
        console.log(`     ${index + 1}. ${sender.email}`);
        console.log(`        - Active: ${sender.is_active}`);
        console.log(`        - Warmup Status: ${sender.warmup_status}`);
        console.log(`        - Health Score: ${sender.health_score}`);
      });
    }
    
    // Test the query that the warmup API uses
    console.log('\n3. WARMUP API QUERY TEST:');
    for (const campaign of campaigns || []) {
      const settings = campaign.settings || {};
      console.log(`\n   Testing campaign ${campaign.name}:`);
      console.log(`   - Has auto_warmup: ${!!settings.auto_warmup}`);
      
      if (settings.auto_warmup) {
        const { data: senders, error: sendersError } = await supabase
          .from('campaign_senders')
          .select('email, health_score, daily_limit, warmup_status')
          .eq('campaign_id', campaign.id)
          .eq('is_selected', true);
        
        if (sendersError) {
          console.error(`   ❌ Error in warmup query:`, sendersError);
        } else {
          console.log(`   ✅ Warmup query returned ${senders?.length || 0} senders`);
          senders?.forEach(sender => {
            console.log(`      - ${sender.email}: health=${sender.health_score}%, status=${sender.warmup_status}`);
            console.log(`        Skip conditions: health >= 90? ${sender.health_score >= 90}, status inactive? ${!sender.warmup_status || sender.warmup_status === 'inactive'}`);
          });
        }
      } else {
        console.log(`   ⏭️ Skipping - auto_warmup not enabled`);
      }
    }
    
  } catch (err) {
    console.error('Error checking production state:', err);
  }
}

checkProductionState();