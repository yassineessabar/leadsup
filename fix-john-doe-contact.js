/**
 * Script to fix John Doe's contact data for proper automation processing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixJohnDoeContact() {
  console.log('🔧 Fixing John Doe contact data...\n');

  try {
    // First, let's find John Doe
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', 268)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching John Doe:', fetchError);
      return;
    }

    if (!contacts) {
      console.log('❌ John Doe (ID: 268) not found');
      return;
    }

    console.log('✅ Found John Doe:');
    console.log(`   Name: ${contacts.first_name} ${contacts.last_name}`);
    console.log(`   Email: ${contacts.email}`);
    console.log(`   Location: ${contacts.location}`);
    console.log(`   Timezone: ${contacts.timezone || 'NOT SET'}`);
    console.log(`   Created: ${contacts.created_at}`);

    // Fix the contact data
    const updates = {
      email: 'john.doe@techcorp.com', // Fix the invalid email
      timezone: 'Australia/Sydney',    // Add proper timezone
      updated_at: new Date().toISOString()
    };

    console.log('\n📝 Applying fixes:');
    console.log(`   Email: @gmail.com → ${updates.email}`);
    console.log(`   Timezone: (not set) → ${updates.timezone}`);

    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', 268)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating John Doe:', updateError);
      return;
    }

    console.log('\n✅ John Doe contact fixed successfully!');
    console.log('   New email:', updated.email);
    console.log('   New timezone:', updated.timezone);

    // Also update the email_address field for the prospects table format
    const { error: emailUpdateError } = await supabase
      .from('contacts')
      .update({ email_address: updates.email })
      .eq('id', 268);

    if (!emailUpdateError) {
      console.log('   Email address field also updated');
    }

    // Check the campaign and sequence details
    console.log('\n📊 Checking campaign details...');
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', contacts.campaign_id)
      .single();

    if (campaign) {
      console.log(`   Campaign: ${campaign.name}`);
      console.log(`   Status: ${campaign.status}`);

      // Check sequences
      const { data: sequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('step_number');

      if (sequences && sequences.length > 0) {
        console.log(`   Sequences: ${sequences.length} steps`);
        console.log(`   First step timing: ${sequences[0].timing_days || 0} days`);
        
        // Calculate when the email should be sent
        const createdAt = new Date(contacts.created_at);
        const scheduledDate = new Date(createdAt);
        scheduledDate.setDate(scheduledDate.getDate() + (sequences[0].timing_days || 0));
        
        console.log(`   Created at: ${createdAt.toLocaleString('en-US', {timeZone: 'Australia/Sydney'})}`);
        console.log(`   Should send: ${scheduledDate.toLocaleString('en-US', {timeZone: 'Australia/Sydney'})}`);
        console.log(`   Current time Sydney: ${new Date().toLocaleString('en-US', {timeZone: 'Australia/Sydney'})}`);
        
        if (scheduledDate <= new Date()) {
          console.log('   ✅ Email should be sent now!');
        } else {
          const hoursRemaining = Math.round((scheduledDate - new Date()) / (1000 * 60 * 60));
          console.log(`   ⏰ Email will be sent in ${hoursRemaining} hours`);
        }
      }
    }

    console.log('\n🎯 Next steps:');
    console.log('1. The automation will run again at the next hour');
    console.log('2. John Doe should now be processed correctly with:');
    console.log('   - Valid email address: john.doe@techcorp.com');
    console.log('   - Proper timezone: Australia/Sydney');
    console.log('3. Check the GitHub Actions logs for detailed processing info');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixJohnDoeContact().catch(console.error);