/**
 * Check the progress status of both John Doe contacts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkContactProgress() {
  console.log('🔍 Checking progress for both John Doe contacts...\n');

  try {
    // Check both contacts
    for (const contactId of ['267', '268']) {
      console.log(`📋 Contact ID ${contactId}:`);
      
      // Get contact details
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contact) {
        console.log(`   Name: ${contact.first_name} ${contact.last_name}`);
        console.log(`   Email: ${contact.email}`);
        console.log(`   Created: ${contact.created_at}`);
        console.log(`   Campaign: ${contact.campaign_id}`);
      }

      // Check email tracking
      const { data: tracking } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: false });

      if (tracking && tracking.length > 0) {
        console.log(`   📧 Email tracking records: ${tracking.length}`);
        tracking.forEach((t, i) => {
          console.log(`      ${i + 1}. Status: ${t.status}, Sent: ${t.sent_at}, Campaign: ${t.campaign_id}`);
        });
      } else {
        console.log(`   📧 Email tracking: No records (Step 0)`);
      }

      // Check prospect sequence progress (UUID format)
      const { data: progress } = await supabase
        .from('prospect_sequence_progress')
        .select('*')
        .eq('prospect_id', contactId)
        .order('sent_at', { ascending: false });

      if (progress && progress.length > 0) {
        console.log(`   📊 Prospect progress records: ${progress.length}`);
        progress.forEach((p, i) => {
          console.log(`      ${i + 1}. Status: ${p.status}, Sent: ${p.sent_at}, Step: ${p.step_number}`);
        });
      } else {
        console.log(`   📊 Prospect progress: No records`);
      }

      // Check inbox messages
      const contactEmail = contact?.email;
      if (contactEmail) {
        const { data: inbox } = await supabase
          .from('inbox_messages')
          .select('*')
          .eq('contact_email', contactEmail)
          .order('sent_at', { ascending: false });

        if (inbox && inbox.length > 0) {
          console.log(`   📥 Inbox messages: ${inbox.length}`);
          inbox.forEach((m, i) => {
            console.log(`      ${i + 1}. Direction: ${m.direction}, Sent: ${m.sent_at}, Subject: ${m.subject}`);
          });
        } else {
          console.log(`   📥 Inbox messages: No records`);
        }
      }

      console.log('');
    }

    // Check campaign sequences
    console.log('📋 Campaign sequences:');
    const { data: sequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', 'a1eca083-a7c6-489b-b59e-c66aa2b0b601')
      .order('step_number');

    if (sequences) {
      sequences.forEach(seq => {
        console.log(`   Step ${seq.step_number}: "${seq.subject}" (${seq.timing_days} days)`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking progress:', error);
  }
}

// Run the check
checkContactProgress().catch(console.error);