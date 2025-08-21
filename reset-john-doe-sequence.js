/**
 * Reset John Doe's sequence to original state for testing GitHub automation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function resetJohnDoeSequence() {
  console.log('🔄 Resetting John Doe sequence to original state...\n');

  try {
    // 1. Reset creation time to make email due very soon
    const now = new Date();
    const dueTime = new Date(now);
    dueTime.setMinutes(dueTime.getMinutes() + 5); // Due in 5 minutes
    
    // Set creation time so that with 0 timing_days, email is due in 5 minutes
    const creationTime = new Date(dueTime);
    creationTime.setMinutes(creationTime.getMinutes() - 5);
    
    console.log('📅 Setting optimal timing for GitHub automation...');
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   New creation time: ${creationTime.toISOString()}`);
    console.log(`   Email will be due at: ${dueTime.toISOString()}`);
    console.log(`   Sydney time due: ${dueTime.toLocaleString('en-US', {timeZone: 'Australia/Sydney'})}`);

    // Update John Doe's creation time
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        created_at: creationTime.toISOString()
      })
      .eq('id', 268)
      .select();

    if (updateError) {
      console.error('❌ Error updating creation time:', updateError);
      return;
    }

    console.log('✅ John Doe creation time updated!');

    // 2. Clear any existing progress records to reset sequence to step 0
    console.log('\n🗑️ Clearing existing progress records...');
    
    // Clear prospect sequence progress (UUID format)
    const { error: progressError } = await supabase
      .from('prospect_sequence_progress')
      .delete()
      .eq('prospect_id', '268');

    // Clear email tracking (integer format)  
    const { error: trackingError } = await supabase
      .from('email_tracking')
      .delete()
      .eq('contact_id', '268');

    if (progressError && !progressError.message.includes('0 rows')) {
      console.log('⚠️ Progress records error (this is normal if no records exist):', progressError.message);
    } else {
      console.log('✅ Progress records cleared');
    }

    if (trackingError && !trackingError.message.includes('0 rows')) {
      console.log('⚠️ Tracking records error (this is normal if no records exist):', trackingError.message);
    } else {
      console.log('✅ Email tracking cleared');
    }

    // 3. Verify the reset
    console.log('\n📊 Verifying reset...');
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', 268)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching contact:', fetchError);
      return;
    }

    console.log('📋 John Doe status:');
    console.log(`   Name: ${contact.first_name} ${contact.last_name}`);
    console.log(`   Email: ${contact.email}`);
    console.log(`   Location: ${contact.location}`);
    console.log(`   Created: ${contact.created_at}`);
    console.log(`   Campaign: ${contact.campaign_id}`);

    // 4. Test the automation to confirm it will process
    console.log('\n🧪 Testing automation readiness...');
    
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=1440', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.N8N_API_USERNAME}:${process.env.N8N_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.debugInfo?.johnDoeScheduleInfo) {
      const schedule = result.debugInfo.johnDoeScheduleInfo;
      console.log('📅 Scheduling verification:');
      console.log(`   Scheduled for: ${schedule.scheduledSydney}`);
      console.log(`   Current time: ${schedule.currentSydney}`);
      console.log(`   Is Due: ${schedule.isDue ? '✅ YES' : '❌ NO'}`);
      console.log(`   Minutes until due: ${-schedule.minutesDiff}`);
    }

    console.log('\n🎯 STATUS:');
    if (result.processed > 0) {
      console.log('✅ Email was processed immediately - sequence reset successful!');
      console.log('📤 Check sent folder for the email');
    } else {
      console.log('⏰ Email will be processed by next GitHub automation run');
      console.log('⏳ GitHub Actions runs every hour at xx:05');
      console.log('📧 John Doe email will be sent and appear in sent folder');
    }

    console.log('\n🚀 READY FOR GITHUB AUTOMATION TEST!');
    console.log('🔄 Next automation run will process John Doe and send email');
    console.log('📤 Email will appear in inbox sent folder');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the reset
resetJohnDoeSequence().catch(console.error);