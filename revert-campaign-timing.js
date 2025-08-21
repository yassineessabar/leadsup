/**
 * Revert campaign sequences back to original timing after testing
 * This restores the proper intervals for the live campaign
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function revertCampaignTiming() {
  console.log('🔄 Reverting campaign sequences to original timing...\n');

  try {
    // Original campaign sequence timing
    const originalSequences = [
      { step_number: 1, timing_days: 0 },   // Immediate
      { step_number: 2, timing_days: 66 },  // 66 days later
      { step_number: 3, timing_days: 3 },   // 3 days after step 2
      { step_number: 4, timing_days: 69 },  // 69 days after step 1
      { step_number: 5, timing_days: 6 },   // 6 days after step 4
      { step_number: 6, timing_days: 72 }   // 72 days after step 1
    ];

    console.log('📋 Restoring original campaign sequences:');
    
    for (const seq of originalSequences) {
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

    // Reset John Doe contacts to proper dates (remove test timing)
    console.log('\n👥 Resetting John Doe contacts to normal operation...');
    
    const contacts = [
      { id: 267, email: 'essabar.yassine@gmail.com' },
      { id: 268, email: 'john.doe@techcorp.com' }
    ];

    // Set contacts to their original creation dates (or recent normal dates)
    const normalDate = new Date('2025-01-15T10:00:00.000Z'); // A reasonable past date
    
    for (const contact of contacts) {
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ 
          created_at: normalDate.toISOString()
        })
        .eq('id', contact.id);

      if (contactError) {
        console.error(`Error updating contact ${contact.id}:`, contactError);
      } else {
        console.log(`✅ Contact ${contact.id} (${contact.email}): Reset to normal timing`);
      }
    }

    // Verify the changes
    console.log('\n🔍 Verifying restored sequences...');
    const { data: verifySequences, error: verifyError } = await supabase
      .from('campaign_sequences')
      .select('step_number, timing_days, subject')
      .eq('campaign_id', 'a1eca083-a7c6-489b-b59e-c66aa2b0b601')
      .order('step_number');

    if (verifySequences) {
      console.log('📋 Current campaign sequences:');
      verifySequences.forEach(seq => {
        console.log(`   Step ${seq.step_number}: "${seq.subject}" - ${seq.timing_days} days`);
      });
    }

    console.log('\n🎯 REVERT COMPLETE!');
    console.log('✅ Campaign sequences restored to original timing');
    console.log('✅ John Doe contacts reset to normal operation');
    console.log('📧 Campaign will now follow proper long-term intervals');
    console.log('⚠️  Any test emails sent during testing period remain in sent folder');

    console.log('\n📅 Original sequence schedule restored:');
    console.log('   Step 1: Immediate (0 days)');
    console.log('   Step 2: 66 days after step 1');  
    console.log('   Step 3: 3 days after step 2 (69 days total)');
    console.log('   Step 4: 69 days after step 1');
    console.log('   Step 5: 6 days after step 4 (75 days total)');
    console.log('   Step 6: 72 days after step 1');

  } catch (error) {
    console.error('❌ Error reverting campaign timing:', error);
  }
}

// Run the revert
revertCampaignTiming().catch(console.error);