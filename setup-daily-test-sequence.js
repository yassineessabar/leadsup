/**
 * Set up John Doe contacts for daily testing (since hourly requires decimal days which isn't supported)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupDailyTestSequence() {
  console.log('🧪 Setting up John Doe contacts for immediate and daily testing...\n');

  try {
    // Update campaign sequences to short intervals for testing
    console.log('🔧 Updating campaign sequences to short intervals...');
    
    const testSequences = [
      { step_number: 1, timing_days: 0 },   // Immediate
      { step_number: 2, timing_days: 0 },   // Same day
      { step_number: 3, timing_days: 0 },   // Same day
      { step_number: 4, timing_days: 1 },   // Tomorrow
      { step_number: 5, timing_days: 1 },   // Tomorrow  
      { step_number: 6, timing_days: 2 }    // Day after tomorrow
    ];

    for (const seq of testSequences) {
      const { error: updateError } = await supabase
        .from('campaign_sequences')
        .update({ 
          timing_days: seq.timing_days
        })
        .eq('campaign_id', 'a1eca083-a7c6-489b-b59e-c66aa2b0b601')
        .eq('step_number', seq.step_number);

      if (updateError) {
        console.error(`Error updating sequence ${seq.step_number}:`, updateError);
      } else {
        console.log(`✅ Step ${seq.step_number}: ${seq.timing_days} days`);
      }
    }

    // Set both contacts to start today at 1 PM Sydney
    const today = new Date();
    const sydneyDate = new Date(today.toLocaleString("en-US", {timeZone: "Australia/Sydney"}));
    const today1PM = new Date(sydneyDate.getFullYear(), sydneyDate.getMonth(), sydneyDate.getDate(), 13, 0, 0);
    const today1PMUtc = new Date(today1PM.getTime() - (10 * 60 * 60 * 1000)); // Convert to UTC

    console.log('\n👥 Resetting both John Doe contacts to 1 PM Sydney today...');
    
    const contacts = [
      { id: 267, email: 'essabar.yassine@gmail.com' },
      { id: 268, email: 'john.doe@techcorp.com' }
    ];

    for (const contact of contacts) {
      // Set creation time to 1 PM today 
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ 
          created_at: today1PMUtc.toISOString()
        })
        .eq('id', contact.id);

      if (contactError) {
        console.error(`Error updating contact ${contact.id}:`, contactError);
      } else {
        console.log(`✅ Contact ${contact.id} (${contact.email}): Set to 1 PM Sydney`);
      }

      // Clear all progress records
      await supabase.from('email_tracking').delete().eq('contact_id', contact.id.toString());
      await supabase.from('inbox_messages').delete().eq('contact_email', contact.email);
      await supabase.from('inbox_threads').delete().eq('contact_email', contact.email);
      
      console.log(`   📧 Progress cleared for contact ${contact.id}`);
    }

    // Current timing analysis
    console.log('\n🕐 Timing analysis:');
    const now = new Date();
    const sydneyNow = now.toLocaleString('en-US', {timeZone: 'Australia/Sydney'});
    const currentHour = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Sydney"})).getHours();
    
    console.log(`   Current Sydney time: ${sydneyNow}`);
    console.log(`   Contact creation: 1:00 PM Sydney (${today1PMUtc.toISOString()})`);
    
    if (currentHour >= 13) {
      console.log(`   ✅ Past 1 PM - emails should be due NOW`);
      console.log(`   📧 Steps 1, 2, 3 should all send immediately (0 days timing)`);
    } else {
      console.log(`   ⏰ Before 1 PM - emails will be due at 1 PM`);
    }

    // Test automation
    console.log('\n🧪 Testing automation with updated timing...');
    
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=1440', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.N8N_API_USERNAME}:${process.env.N8N_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`📧 Test result: ${result.processed} processed, ${result.sent} sent`);

    if (result.results && result.results.length > 0) {
      console.log('📋 Emails sent:');
      result.results.forEach(r => {
        console.log(`   ID: ${r.contactId}, Email: ${r.contactEmail}, Step: ${r.sequenceStep}, Status: ${r.status}`);
      });
    }

    console.log('\n🎯 TEST SETUP COMPLETE!');
    console.log('✅ Both contacts set to start at 1 PM Sydney today');
    console.log('✅ Sequences 1-3: 0 days (immediate)');
    console.log('✅ Sequences 4-5: 1 day');  
    console.log('✅ Sequence 6: 2 days');
    console.log('⏰ Multiple emails should send quickly due to 0-day timing');
    console.log('📧 Check sent folder after automation runs');

    console.log('\n📝 TO REVERT AFTER TESTING:');
    console.log('   Run the revert script to restore original timing:');
    console.log('   - Step 1: 0 days');
    console.log('   - Step 2: 66 days');
    console.log('   - Step 3: 3 days');
    console.log('   - Step 4: 69 days');
    console.log('   - Step 5: 6 days');
    console.log('   - Step 6: 72 days');

  } catch (error) {
    console.error('❌ Error setting up test:', error);
  }
}

// Run the setup
setupDailyTestSequence().catch(console.error);