/**
 * Find all John Doe contacts to identify which one is shown in the UI
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findAllJohnDoe() {
  console.log('🔍 Finding all John Doe contacts...\n');

  try {
    // Search in contacts table
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .or('first_name.ilike.%john%,last_name.ilike.%doe%,email.ilike.%john%,email.ilike.%doe%');

    // Search in prospects table
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select('*')
      .or('first_name.ilike.%john%,last_name.ilike.%doe%,email_address.ilike.%john%,email_address.ilike.%doe%');

    console.log('📋 Contacts table results:');
    if (contacts && contacts.length > 0) {
      contacts.forEach((contact, index) => {
        console.log(`   ${index + 1}. ID: ${contact.id}`);
        console.log(`      Name: ${contact.first_name} ${contact.last_name}`);
        console.log(`      Email: ${contact.email || contact.email_address || 'not set'}`);
        console.log(`      Campaign: ${contact.campaign_id}`);
        console.log(`      Created: ${contact.created_at}`);
        console.log(`      Status: ${contact.status || 'not set'}`);
        console.log('');
      });
    } else {
      console.log('   No John Doe found in contacts table');
    }

    console.log('📋 Prospects table results:');
    if (prospects && prospects.length > 0) {
      prospects.forEach((prospect, index) => {
        console.log(`   ${index + 1}. ID: ${prospect.id}`);
        console.log(`      Name: ${prospect.first_name} ${prospect.last_name}`);
        console.log(`      Email: ${prospect.email_address || prospect.email || 'not set'}`);
        console.log(`      Campaign: ${prospect.campaign_id}`);
        console.log(`      Created: ${prospect.created_at}`);
        console.log(`      Status: ${prospect.status || 'not set'}`);
        console.log('');
      });
    } else {
      console.log('   No John Doe found in prospects table');
    }

    // Search for contacts with your email specifically
    console.log('🔍 Searching for contacts with essabar.yassine@gmail.com...');
    
    const { data: yourEmailContacts } = await supabase
      .from('contacts')
      .select('*')
      .or('email.eq.essabar.yassine@gmail.com,email_address.eq.essabar.yassine@gmail.com');

    const { data: yourEmailProspects } = await supabase
      .from('prospects')
      .select('*')
      .or('email.eq.essabar.yassine@gmail.com,email_address.eq.essabar.yassine@gmail.com');

    if (yourEmailContacts && yourEmailContacts.length > 0) {
      console.log('📧 Contacts with your email:');
      yourEmailContacts.forEach(contact => {
        console.log(`   ID: ${contact.id}, Name: ${contact.first_name} ${contact.last_name}, Campaign: ${contact.campaign_id}`);
      });
    }

    if (yourEmailProspects && yourEmailProspects.length > 0) {
      console.log('📧 Prospects with your email:');
      yourEmailProspects.forEach(prospect => {
        console.log(`   ID: ${prospect.id}, Name: ${prospect.first_name} ${prospect.last_name}, Campaign: ${prospect.campaign_id}`);
      });
    }

    // Check campaign sequences for info@leadsup.io sender
    console.log('\n🔍 Checking campaigns with info@leadsup.io sender...');
    const { data: senders } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('from_email', 'info@leadsup.io');

    if (senders && senders.length > 0) {
      console.log('📤 Found info@leadsup.io senders:');
      for (const sender of senders) {
        console.log(`   Sender ID: ${sender.id}, Campaign: ${sender.campaign_id}`);
        
        // Check if this campaign has John Doe
        const { data: campaignContacts } = await supabase
          .from('contacts')
          .select('*')
          .eq('campaign_id', sender.campaign_id)
          .ilike('first_name', '%john%');
          
        const { data: campaignProspects } = await supabase
          .from('prospects')
          .select('*')
          .eq('campaign_id', sender.campaign_id)
          .ilike('first_name', '%john%');

        if (campaignContacts && campaignContacts.length > 0) {
          console.log(`   📋 John contacts in this campaign:`);
          campaignContacts.forEach(c => {
            console.log(`      ID: ${c.id}, Email: ${c.email || c.email_address}, Created: ${c.created_at}`);
          });
        }

        if (campaignProspects && campaignProspects.length > 0) {
          console.log(`   📋 John prospects in this campaign:`);
          campaignProspects.forEach(p => {
            console.log(`      ID: ${p.id}, Email: ${p.email_address || p.email}, Created: ${p.created_at}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error searching:', error);
  }
}

// Run the search
findAllJohnDoe().catch(console.error);