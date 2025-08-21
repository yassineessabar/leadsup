/**
 * Force an email to be due for testing by adjusting the contact creation time
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function forceEmailDue() {
  console.log('🔧 Forcing John Doe email to be due...\n');

  try {
    // Calculate what the creation time should be to make email due now
    // If we want the email to be due now, and it's scheduled with timing_days = 0
    // then we need to set the creation time to yesterday (or earlier)
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1); // 1 day ago
    yesterday.setHours(10, 0, 0, 0); // 10 AM yesterday
    
    console.log('📅 Adjusting John Doe creation time...');
    console.log(`   Current creation time: 2025-08-21T01:20:33.331Z`);
    console.log(`   New creation time: ${yesterday.toISOString()}`);
    
    // Update John Doe's creation time to make the email due
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        created_at: yesterday.toISOString()
      })
      .eq('id', 268)
      .select();

    if (updateError) {
      console.error('❌ Error updating creation time:', updateError);
      return;
    }

    console.log('✅ John Doe creation time updated!');
    
    // Test the automation immediately
    console.log('\n🧪 Testing automation with updated creation time...');
    
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=1440', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.N8N_API_USERNAME}:${process.env.N8N_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('📧 Test result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Processed: ${result.processed}`);
    
    if (result.debugInfo?.johnDoeScheduleInfo) {
      const schedule = result.debugInfo.johnDoeScheduleInfo;
      console.log('\n📅 Updated schedule:');
      console.log(`   Created: ${schedule.createdAt}`);
      console.log(`   Scheduled: ${schedule.scheduledSydney}`);
      console.log(`   Current: ${schedule.currentSydney}`);
      console.log(`   Is Due: ${schedule.isDue ? '✅ YES' : '❌ NO'}`);
      console.log(`   Minutes: ${schedule.minutesDiff}`);
    }
    
    if (result.processed > 0) {
      console.log('\n🎉 SUCCESS! Email was sent!');
      console.log('📤 Check the sent folder in the inbox tab');
    } else {
      console.log('\n⚠️ Still not due - may need more adjustment');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
forceEmailDue().catch(console.error);