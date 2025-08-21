/**
 * Simple fix for John Doe - just update the email to be valid
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixJohnDoeEmail() {
  console.log('🔧 Fixing John Doe email address...\n');

  try {
    // Update just the email field
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        email: 'john.doe@techcorp.com'
      })
      .eq('id', 268)
      .select();

    if (updateError) {
      console.error('❌ Error updating email:', updateError);
      return;
    }

    console.log('✅ John Doe email updated successfully!');
    console.log(`   New email: john.doe@techcorp.com`);

    // Verify the update
    const { data: verified, error: verifyError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, location')
      .eq('id', 268)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log('\n📊 Verified John Doe data:');
    console.log(`   Name: ${verified.first_name} ${verified.last_name}`);
    console.log(`   Email: ${verified.email}`);
    console.log(`   Location: ${verified.location}`);

    console.log('\n🎯 Status:');
    console.log('✅ Email fixed - now has valid email address');
    console.log('✅ Location "Sydney" should derive to "Australia/Sydney" timezone');
    console.log('⏳ Next automation run should process this contact');

    // Calculate expected schedule
    const createdAt = new Date('2025-08-21T01:20:33.331+00:00');
    const sydneyTime = createdAt.toLocaleString('en-US', {timeZone: 'Australia/Sydney'});
    console.log(`\n📅 Scheduling info:`);
    console.log(`   Contact created: ${sydneyTime} (Sydney time)`);
    console.log('   If timing_days = 0: Should send today');
    console.log('   If timing_days > 0: Will send later');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixJohnDoeEmail().catch(console.error);