const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWarmupTracking() {
  try {
    console.log('🔍 Checking if warmup tracking data was saved...\n');
    
    const { data: trackingData, error } = await supabase
      .from('campaign_senders')
      .select('email, warmup_status, last_warmup_sent, warmup_phase, warmup_days_completed, warmup_emails_sent_today, updated_at')
      .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
      .eq('is_selected', true);
    
    if (error) {
      console.error('❌ Error querying tracking data:', error);
      return;
    }
    
    console.log('📊 Current warmup tracking data:');
    trackingData?.forEach((sender, index) => {
      const updatedRecently = sender.updated_at && 
        (new Date().getTime() - new Date(sender.updated_at).getTime()) < 5 * 60 * 1000; // within 5 minutes
      
      console.log(`\n${index + 1}. ${sender.email}:`);
      console.log(`   - Warmup Status: ${sender.warmup_status}`);
      console.log(`   - Last Warmup Sent: ${sender.last_warmup_sent || 'NULL'}`);
      console.log(`   - Warmup Phase: ${sender.warmup_phase}`);
      console.log(`   - Days Completed: ${sender.warmup_days_completed}`);
      console.log(`   - Emails Sent Today: ${sender.warmup_emails_sent_today}`);
      console.log(`   - Updated At: ${sender.updated_at} ${updatedRecently ? '(RECENT)' : '(OLD)'}`);
    });
    
    // Test if we can manually update the tracking columns
    console.log('\n🧪 Testing manual update of tracking columns...');
    
    const testEmail = trackingData?.[0]?.email;
    if (testEmail) {
      const { error: updateError } = await supabase
        .from('campaign_senders')
        .update({
          last_warmup_sent: new Date().toISOString(),
          warmup_phase: 1,
          warmup_days_completed: 1,
          warmup_emails_sent_today: 6
        })
        .eq('email', testEmail)
        .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e');
      
      if (updateError) {
        console.log('❌ Failed to update tracking columns:', updateError.message);
        console.log('💡 This indicates the columns might not have the right permissions or structure');
      } else {
        console.log(`✅ Successfully updated tracking data for ${testEmail}`);
        
        // Verify the update worked
        const { data: verifyData } = await supabase
          .from('campaign_senders')
          .select('email, last_warmup_sent, warmup_phase, warmup_days_completed, warmup_emails_sent_today')
          .eq('email', testEmail)
          .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
          .single();
        
        console.log('📊 Verified updated data:', verifyData);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkWarmupTracking();