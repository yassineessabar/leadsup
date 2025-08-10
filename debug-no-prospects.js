/**
 * Debug Why No Prospects Ready for Processing
 */

async function debugNoProspects() {
  console.log('🔍 Debugging: Why 0 Prospects Ready?');
  console.log('=' .repeat(50));
  
  const campaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';
  
  try {
    // 1. Check prospects assigned to campaign
    console.log('\n📋 1. Checking Prospects in Campaign:');
    const prospectsResponse = await fetch(`http://localhost:3000/api/prospects?campaign_id=${campaignId}`);
    
    if (prospectsResponse.ok) {
      const prospects = await prospectsResponse.json();
      console.log(`   Total prospects: ${prospects.length}`);
      
      if (prospects.length > 0) {
        prospects.forEach(p => {
          console.log(`   - ${p.first_name} ${p.last_name} (${p.email})`);
        });
      }
    } else {
      console.log('   ❌ Could not fetch prospects');
    }
    
    // 2. Check prospect_sequence_progress
    console.log('\n📊 2. Checking Prospect Sequence Progress:');
    console.log('   Run this SQL query:');
    console.log('   ```sql');
    console.log(`   SELECT 
       psp.prospect_id,
       psp.sequence_id,
       psp.status,
       psp.sent_at,
       p.email
     FROM prospect_sequence_progress psp
     JOIN prospects p ON psp.prospect_id = p.id
     WHERE psp.campaign_id = '${campaignId}'
     ORDER BY psp.sent_at DESC;`);
    console.log('   ```');
    
    // 3. Check contact_sequences table
    console.log('\n📧 3. Checking Contact Sequences:');
    console.log('   Run this SQL query:');
    console.log('   ```sql');
    console.log(`   SELECT 
       cs.contact_id,
       cs.sequence_id,
       cs.status,
       cs.sent_at,
       p.email
     FROM contact_sequences cs
     JOIN prospects p ON cs.contact_id = p.id
     WHERE cs.campaign_id = '${campaignId}'
     ORDER BY cs.sent_at DESC;`);
    console.log('   ```');
    
    // 4. Check if prospects need next sequence
    console.log('\n🔄 4. Possible Reasons for 0 Prospects:');
    console.log('');
    console.log('   a) ✅ All emails already sent (check database)');
    console.log('   b) ⏰ Waiting for next sequence timing (e.g., 1 day delay)');
    console.log('   c) 📅 Timezone scheduling (not in sending window)');
    console.log('   d) 🚫 Daily limits reached');
    console.log('   e) 🔄 Need to reset prospect status');
    
    // 5. Quick fix suggestions
    console.log('\n🛠️ 5. Quick Fixes to Try:');
    console.log('');
    console.log('   Option A: Reset prospect sequence progress');
    console.log('   ```sql');
    console.log(`   DELETE FROM prospect_sequence_progress 
     WHERE campaign_id = '${campaignId}';`);
    console.log('   ```');
    console.log('');
    console.log('   Option B: Reset contact sequences');
    console.log('   ```sql');
    console.log(`   DELETE FROM contact_sequences 
     WHERE campaign_id = '${campaignId}';`);
    console.log('   ```');
    console.log('');
    console.log('   Option C: Add new prospects to campaign');
    console.log('   - Go to Leads tab');
    console.log('   - Select prospects');
    console.log('   - Assign to campaign');
    
    // 6. Test the automation API directly
    console.log('\n🧪 6. Testing Automation API:');
    const automationResponse = await fetch('http://localhost:3000/api/campaigns/automation/process-pending', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    });
    
    if (automationResponse.ok) {
      const data = await automationResponse.json();
      console.log(`   Success: ${data.success}`);
      
      if (data.data && data.data.length > 0) {
        const campaign = data.data[0];
        console.log(`   Campaign: ${campaign.name}`);
        console.log(`   Contacts ready: ${campaign.contacts?.length || 0}`);
        
        if (campaign.contacts && campaign.contacts.length > 0) {
          console.log('   Contacts:');
          campaign.contacts.forEach(c => {
            console.log(`     - ${c.firstName} ${c.lastName}: Next sequence #${c.nextSequence?.step_number}`);
          });
        }
      } else {
        console.log('   ❌ No campaigns with ready contacts');
      }
    }
    
  } catch (error) {
    console.error('Error debugging:', error);
  }
}

debugNoProspects();