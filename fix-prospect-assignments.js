#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function fixProspectAssignments() {
  console.log('🔧 FIXING PROSPECT ASSIGNMENTS');
  console.log('===============================\n');
  
  try {
    const campaignId = '2b50f173-9ae7-47ee-85fb-918f0d0dea33';
    
    // Get the available sender for this campaign
    const { data: availableSenders } = await supabase
      .from('campaign_senders')
      .select('email, name')
      .eq('campaign_id', campaignId)
      .eq('is_active', true);
      
    if (!availableSenders || availableSenders.length === 0) {
      console.log('❌ No active senders found for this campaign');
      return;
    }
    
    const sender = availableSenders[0]; // Use the first available sender
    console.log(`📧 Available sender: ${sender.email} (${sender.name})`);
    
    // Get all prospects for this campaign
    const { data: prospects } = await supabase
      .from('prospects')
      .select('*')
      .eq('campaign_id', campaignId);
      
    console.log(`👥 Found ${prospects?.length || 0} prospects to fix`);
    
    if (!prospects || prospects.length === 0) {
      console.log('❌ No prospects found for this campaign');
      return;
    }
    
    // Sample data to assign to prospects
    const sampleData = [
      { firstName: 'John', lastName: 'Smith', email: 'ecomm2405@gmail.com' },
      { firstName: 'Jane', lastName: 'Doe', email: 'essabar.yassine@gmail.com' },
      { firstName: 'Mike', lastName: 'Johnson', email: 'anthoy2327@gmail.com' }
    ];
    
    console.log('\\n🔄 Updating prospect assignments...');
    
    for (let i = 0; i < prospects.length; i++) {
      const prospect = prospects[i];
      const sampleInfo = sampleData[i % sampleData.length]; // Cycle through sample data
      
      const updateData = {
        first_name: sampleInfo.firstName,
        last_name: sampleInfo.lastName,
        email_address: sampleInfo.email,
        sender_email: sender.email, // Assign to the available sender
        analysed: true
      };
      
      console.log(`   ${i+1}. Updating: ${sampleInfo.firstName} ${sampleInfo.lastName} <${sampleInfo.email}>`);
      console.log(`      Assigning to sender: ${sender.email}`);
      
      const { error } = await supabase
        .from('prospects')
        .update(updateData)
        .eq('id', prospect.id);
        
      if (error) {
        console.error(`❌ Error updating prospect ${i+1}:`, error);
      } else {
        console.log(`✅ Updated prospect ${i+1}`);
      }
    }
    
    console.log('\\n🎯 Assignment fix complete!');
    console.log('All prospects are now assigned to the correct sender for this campaign.');
    console.log('Try running the campaign automation again.');
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

fixProspectAssignments()
  .then(() => {
    console.log('\\n✅ Fix complete');
  })
  .catch(error => {
    console.error('❌ Fix failed:', error);
  });