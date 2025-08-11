#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function setupCampaignSender() {
  console.log('🚀 SETTING UP CAMPAIGN SENDER');
  console.log('=============================\n');
  
  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387';
    const campaignId = '2b50f173-9ae7-47ee-85fb-918f0d0dea33';
    
    // First, create a default sender using MailerSend
    console.log('📧 Creating MailerSend sender...');
    const { data: newSender, error: senderError } = await supabase
      .from('senders')
      .insert({
        user_id: userId,
        email: 'hello@leadsup.io', // Your MailerSend verified domain
        name: 'LeadsUp Support',
        auth_type: 'api_key',
        status: 'active',
        provider: 'mailersend',
        api_key: process.env.MAILERSEND_API_TOKEN || 'mlsn.8ac86c7240b7326eab5aee6037f008b63f431c7d87419bb73bae4751d88bbd10',
        daily_limit: 100,
        sent_today: 0,
        timezone: 'America/New_York',
        business_hours_start: '09:00',
        business_hours_end: '17:00'
      })
      .select()
      .single();
      
    if (senderError) {
      console.error('❌ Error creating sender:', senderError);
      return;
    }
    
    console.log('✅ Created sender:', newSender.email);
    console.log(`   Sender ID: ${newSender.id}`);
    
    // Check prospects that need fixing
    console.log('\n👥 Checking prospects...');
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select('*')
      .eq('campaign_id', campaignId);
      
    if (prospectsError) {
      console.error('❌ Error fetching prospects:', prospectsError);
      return;
    }
    
    console.log(`📊 Found ${prospects?.length || 0} prospects`);
    
    if (prospects && prospects.length > 0) {
      // Update prospects with proper data
      console.log('🔧 Fixing prospect data...');
      
      const sampleEmails = [
        'ecomm2405@gmail.com',
        'essabar.yassine@gmail.com', 
        'anthoy2327@gmail.com'
      ];
      
      const sampleNames = [
        ['John', 'Smith'],
        ['Jane', 'Doe'],
        ['Mike', 'Johnson']
      ];
      
      for (let i = 0; i < prospects.length && i < 3; i++) {
        const prospect = prospects[i];
        const email = sampleEmails[i] || `test${i+1}@example.com`;
        const [firstName, lastName] = sampleNames[i] || [`Test${i+1}`, 'User'];
        
        console.log(`   Updating prospect ${i+1}: ${email}`);
        
        const { error: updateError } = await supabase
          .from('prospects')
          .update({
            firstName: firstName,
            lastName: lastName,
            email: email,
            assigned_sender: newSender.email, // Assign our new sender
            status: 'ready_to_send',
            next_email_date: new Date().toISOString() // Ready to send now
          })
          .eq('id', prospect.id);
          
        if (updateError) {
          console.error(`❌ Error updating prospect ${i+1}:`, updateError);
        } else {
          console.log(`✅ Updated prospect: ${firstName} ${lastName} <${email}>`);
        }
      }
    }
    
    console.log('\n🎯 Campaign sender setup complete!');
    console.log('Next: Try running the campaign automation again to test email sending');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupCampaignSender()
  .then(() => {
    console.log('\n✅ Setup complete');
  })
  .catch(error => {
    console.error('❌ Setup failed:', error);
  });