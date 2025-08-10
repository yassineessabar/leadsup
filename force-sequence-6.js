#!/usr/bin/env node
/**
 * Force sequence 6 to be available immediately
 * Updates the sequence 5 timestamp to make sequence 6 ready for sending
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - using your existing credentials
const supabaseUrl = 'https://uorqsibttkcgfkqktfxj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcnFzaWJ0dGtjZ2ZrcWt0ZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIxODM2MzIsImV4cCI6MjAzNzc1OTYzMn0.C6th8dv-7KnK1MrmpGnrYhKNaQc9uOT6mUqGTjq-5qw'; // Service role key needed for updates

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceSequence6() {
  console.log('🔧 Forcing sequence 6 to be available for essabar.yassine@gmail.com...\n');

  try {
    // 1. First, check current status
    console.log('1️⃣ Checking current sequence progress...');
    
    const { data: currentProgress, error: progressError } = await supabase
      .from('prospect_sequence_progress')
      .select(`
        sequence_id,
        sent_at,
        status,
        campaign_sequences (
          step_number,
          title,
          timing_days
        )
      `)
      .eq('prospect_id', (
        await supabase
          .from('prospects')
          .select('id')
          .eq('email_address', 'essabar.yassine@gmail.com')
          .single()
      ).data?.id)
      .eq('status', 'sent')
      .order('created_at', { ascending: false });

    if (progressError) {
      console.error('❌ Error fetching progress:', progressError);
      return;
    }

    console.log(`✅ Found ${currentProgress?.length || 0} completed sequences`);
    
    if (currentProgress && currentProgress.length > 0) {
      const lastSequence = currentProgress[0];
      const stepNumber = lastSequence.campaign_sequences?.step_number;
      const sentAt = new Date(lastSequence.sent_at);
      const timingSays = sentAt.toISOString();
      
      console.log(`📧 Last sequence: Step ${stepNumber} sent at ${timingSays}`);
      console.log(`🕐 Current time: ${new Date().toISOString()}`);
    }

    // 2. Get the prospect ID
    console.log('\n2️⃣ Getting prospect information...');
    
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('id, first_name, email_address, campaign_id')
      .eq('email_address', 'essabar.yassine@gmail.com')
      .single();

    if (prospectError || !prospect) {
      console.error('❌ Could not find prospect:', prospectError);
      return;
    }

    console.log(`✅ Found prospect: ${prospect.first_name} (${prospect.email_address})`);
    console.log(`📋 Campaign ID: ${prospect.campaign_id}`);

    // 3. Find sequence 5 to update
    console.log('\n3️⃣ Finding sequence 5 to update...');
    
    const { data: sequence5, error: seq5Error } = await supabase
      .from('campaign_sequences')
      .select('id, title, timing_days')
      .eq('campaign_id', prospect.campaign_id)
      .eq('step_number', 5)
      .single();

    if (seq5Error || !sequence5) {
      console.error('❌ Could not find sequence 5:', seq5Error);
      return;
    }

    console.log(`✅ Found sequence 5: "${sequence5.title}" (${sequence5.timing_days} days timing)`);

    // 4. Update the sequence 5 timestamp
    console.log('\n4️⃣ Updating sequence 5 timestamp to 14 days ago...');
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { error: updateError } = await supabase
      .from('prospect_sequence_progress')
      .update({
        sent_at: fourteenDaysAgo.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('prospect_id', prospect.id)
      .eq('sequence_id', sequence5.id)
      .eq('status', 'sent');

    if (updateError) {
      console.error('❌ Error updating timestamp:', updateError);
      return;
    }

    console.log(`✅ Updated sequence 5 timestamp to: ${fourteenDaysAgo.toISOString()}`);

    // 5. Check if sequence 6 exists
    console.log('\n5️⃣ Checking for sequence 6...');
    
    const { data: sequence6, error: seq6Error } = await supabase
      .from('campaign_sequences')
      .select('step_number, title, subject, timing_days, is_active')
      .eq('campaign_id', prospect.campaign_id)
      .eq('step_number', 6);

    if (seq6Error) {
      console.error('❌ Error checking sequence 6:', seq6Error);
      return;
    }

    if (sequence6 && sequence6.length > 0) {
      const seq6 = sequence6[0];
      console.log(`✅ Found sequence 6: "${seq6.title}" (Active: ${seq6.is_active})`);
      console.log(`📝 Subject: "${seq6.subject}"`);
      console.log(`⏰ Timing: ${seq6.timing_days} days`);
    } else {
      console.log('⚠️ No sequence 6 found - make sure you created it in your campaign');
    }

    // 6. Verify the contact should now be ready
    console.log('\n6️⃣ Verifying contact is now ready for processing...');
    
    const { data: verifyProgress, error: verifyError } = await supabase
      .from('prospect_sequence_progress')
      .select('sequence_id, sent_at, status')
      .eq('prospect_id', prospect.id)
      .eq('status', 'sent')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      return;
    }

    console.log(`✅ Contact has completed ${verifyProgress?.length || 0} sequences`);
    console.log(`🎯 Next sequence should be: Step ${(verifyProgress?.length || 0) + 1}`);

    const lastSent = verifyProgress && verifyProgress.length > 0 
      ? new Date(verifyProgress[0].sent_at)
      : null;
      
    if (lastSent) {
      const hoursSinceLastSent = (new Date() - lastSent) / (1000 * 60 * 60);
      console.log(`⏰ Time since last sent: ${Math.round(hoursSinceLastSent)} hours`);
      
      if (hoursSinceLastSent > 24) {
        console.log('✅ Contact should now be ready for sequence 6!');
      } else {
        console.log('⚠️ May need to wait longer or adjust timing further');
      }
    }

    console.log('\n🎯 Update complete! Try running the email API again:');
    console.log('curl -u \'admin:password\' -X POST http://localhost:3001/api/campaigns/automation/send-emails');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

forceSequence6().catch(console.error);