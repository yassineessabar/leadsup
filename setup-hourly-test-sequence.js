/**
 * Set up both John Doe contacts for hourly testing with 1-hour intervals
 * This will be reverted after testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupHourlyTestSequence() {
  console.log('🧪 Setting up John Doe contacts for hourly testing...\n');

  try {
    // First, backup the original campaign sequences
    const { data: originalSequences, error: seqError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', 'a1eca083-a7c6-489b-b59e-c66aa2b0b601')
      .order('step_number');

    if (originalSequences) {
      console.log('📋 Original campaign sequences (BACKUP):');
      originalSequences.forEach(seq => {
        console.log(`   Step ${seq.step_number}: "${seq.subject}" - ${seq.timing_days} days`);
      });
      console.log('');
    }

    // Get today at 1 PM Sydney time in UTC
    const sydneyTime = new Date().toLocaleString("en-US", {timeZone: "Australia/Sydney"});
    const sydneyDate = new Date(sydneyTime);
    const today1PM = new Date(sydneyDate.getFullYear(), sydneyDate.getMonth(), sydneyDate.getDate(), 13, 0, 0); // 1 PM Sydney
    const today1PMUtc = new Date(today1PM.getTime() - (10 * 60 * 60 * 1000)); // Convert to UTC (Sydney is UTC+10)

    console.log('📅 Test timing setup:');
    console.log(`   Base time: ${today1PM.toLocaleString()} Sydney (${today1PMUtc.toISOString()} UTC)`);

    // Update campaign sequences to 1-hour intervals for testing
    console.log('\n🔧 Updating campaign sequences to 1-hour intervals...');
    
    const hourlySequences = [
      { step_number: 1, timing_days: 0, subject: 'Quick question about {{companyName}}' },      // 1:00 PM
      { step_number: 2, timing_days: 0.042, subject: 'New updates for {{companyName}}' },       // ~2:00 PM (1 hour = 0.042 days)
      { step_number: 3, timing_days: 0.042, subject: 'Quick question about {{companyName}}' },  // ~3:00 PM 
      { step_number: 4, timing_days: 0.042, subject: 'New updates for {{companyName}}' },       // ~4:00 PM
      { step_number: 5, timing_days: 0.042, subject: 'Quick question about {{companyName}}' },  // ~5:00 PM
      { step_number: 6, timing_days: 0.042, subject: 'New updates for {{companyName}}' }        // ~6:00 PM
    ];

    for (const seq of hourlySequences) {
      const { error: updateError } = await supabase
        .from('campaign_sequences')
        .update({ 
          timing_days: seq.timing_days,
          subject: seq.subject
        })
        .eq('campaign_id', 'a1eca083-a7c6-489b-b59e-c66aa2b0b601')
        .eq('step_number', seq.step_number);

      if (updateError) {
        console.error(`Error updating sequence ${seq.step_number}:`, updateError);
      } else {
        console.log(`✅ Step ${seq.step_number}: ${seq.timing_days} days (${seq.timing_days * 24} hours)`);
      }
    }

    // Reset both contacts to start at 1 PM today
    console.log('\n👥 Resetting both John Doe contacts...');
    
    const contacts = [
      { id: 267, email: 'essabar.yassine@gmail.com', name: 'John Doe (your email)' },
      { id: 268, email: 'john.doe@techcorp.com', name: 'John Doe (test email)' }
    ];

    for (const contact of contacts) {
      // Set creation time to 1 PM today UTC
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ 
          created_at: today1PMUtc.toISOString()
        })
        .eq('id', contact.id);

      if (contactError) {
        console.error(`Error updating contact ${contact.id}:`, contactError);
      } else {
        console.log(`✅ Contact ${contact.id} (${contact.email}): Set to start at 1 PM Sydney`);
      }

      // Clear all progress records
      await supabase.from('email_tracking').delete().eq('contact_id', contact.id.toString());
      await supabase.from('inbox_messages').delete().eq('contact_email', contact.email);
      await supabase.from('inbox_threads').delete().eq('contact_email', contact.email);
      
      console.log(`   📧 Progress cleared for contact ${contact.id}`);
    }

    // Test current timing
    console.log('\n🕐 Current timing analysis:');
    const now = new Date();
    const sydneyNow = now.toLocaleString('en-US', {timeZone: 'Australia/Sydney'});
    const currentHour = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Sydney"})).getHours();
    
    console.log(`   Current Sydney time: ${sydneyNow}`);
    console.log(`   Current hour: ${currentHour}`);
    
    if (currentHour >= 13) {
      const emailsShouldBeSent = Math.floor((currentHour - 13) / 1) + 1; // How many hours since 1 PM
      console.log(`   📧 Emails that should be sent by now: ${emailsShouldBeSent}`);
      console.log(`   ⏰ Next email due at: ${currentHour + 1}:00 PM Sydney`);
    } else {
      console.log(`   ⏰ First email due at: 1:00 PM Sydney`);
    }

    // Test automation
    console.log('\n🧪 Testing automation with hourly setup...');
    
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

    console.log('\n🎯 HOURLY TEST SETUP COMPLETE!');
    console.log('✅ Both John Doe contacts reset to 1 PM Sydney start time');
    console.log('✅ Campaign sequences updated to 1-hour intervals');
    console.log('⏰ Automation will send emails every hour');
    console.log('📧 Check sent folder after each automation run');
    
    console.log('\n⚠️  IMPORTANT: Remember to revert these settings after testing!');
    console.log('💾 Original sequences saved in backup above');

  } catch (error) {
    console.error('❌ Error setting up hourly test:', error);
  }
}

// Run the setup
setupHourlyTestSequence().catch(console.error);