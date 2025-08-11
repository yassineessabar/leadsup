#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function updateCampaignSenders() {
  console.log('🔧 UPDATING CAMPAIGN SENDERS FOR APP.LEADSUP.IO');
  console.log('===============================================\n');
  
  // Add new campaign sender for receiving emails
  const newSenders = [
    {
      email: 'campaign@app.leadsup.io',
      user_id: 'e863d418-b24a-4d15-93c6-28f56f4cfad8', // Your user ID
      campaign_id: 'c6639718-2120-4548-9063-ab89c04c9804' // Your campaign ID
    },
    {
      email: 'leads@app.leadsup.io', 
      user_id: 'e863d418-b24a-4d15-93c6-28f56f4cfad8',
      campaign_id: 'c6639718-2120-4548-9063-ab89c04c9804'
    },
    {
      email: 'sales@app.leadsup.io',
      user_id: 'e863d418-b24a-4d15-93c6-28f56f4cfad8', 
      campaign_id: 'c6639718-2120-4548-9063-ab89c04c9804'
    }
  ];
  
  console.log('📧 Adding new campaign senders:');
  
  for (const sender of newSenders) {
    console.log(`   Adding: ${sender.email}`);
    
    const { data, error } = await supabase
      .from('campaign_senders')
      .upsert(sender, {
        onConflict: 'email,campaign_id'
      });
      
    if (error) {
      console.error(`   ❌ Error adding ${sender.email}:`, error.message);
    } else {
      console.log(`   ✅ Added ${sender.email}`);
    }
  }
  
  // Show all campaign senders
  console.log('\n📋 Current campaign senders:');
  const { data: allSenders } = await supabase
    .from('campaign_senders')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (allSenders) {
    allSenders.forEach((sender, i) => {
      const domain = sender.email.split('@')[1];
      const isNew = domain === 'app.leadsup.io';
      console.log(`   ${i + 1}. ${sender.email} ${isNew ? '🆕' : ''}`);
    });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. ✅ Campaign senders updated');
  console.log('2. 🔧 Complete MailerSend domain verification');
  console.log('3. 📧 Test sending from campaign@app.leadsup.io');
  console.log('4. 📡 Test webhook capture system');
}

updateCampaignSenders().catch(console.error);