// Script to create the missing campaign for orphaned prospects
console.log('🔧 Fixing orphaned prospects by creating missing campaign...');

async function createMissingCampaign() {
  try {
    // Create the campaign that the prospects are expecting
    const campaignData = {
      id: 'f4bb948b-cee0-4ed7-be81-ef30810311a2', // Use the expected UUID
      name: 'Email Automation Test Campaign',
      description: 'Campaign created to fix orphaned prospects',
      status: 'Active',
      type: 'email',
      trigger_type: 'manual'
    };
    
    console.log('📋 Creating campaign:', campaignData);
    
    const response = await fetch('http://localhost:3000/api/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Campaign created successfully!');
      console.log('Campaign ID:', result.data?.id || campaignData.id);
      
      // Verify the prospects are now properly linked
      await verifyProspects();
      
      // Test automation again
      await testAutomation();
      
    } else {
      console.error('❌ Failed to create campaign:', result);
      console.log('');
      console.log('💡 Alternative solution:');
      console.log('1. Go to your dashboard and create a new campaign');
      console.log('2. Note the campaign ID');
      console.log('3. Update the 3 prospects to use the new campaign ID');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function verifyProspects() {
  try {
    console.log('\n👥 Verifying prospects are linked to campaign...');
    const response = await fetch('http://localhost:3000/api/prospects?campaign_id=f4bb948b-cee0-4ed7-be81-ef30810311a2');
    const data = await response.json();
    
    console.log(`✅ Found ${data.prospects?.length || 0} prospects linked to campaign:`);
    if (data.prospects) {
      data.prospects.forEach(p => {
        console.log(`  - ${p.first_name} ${p.last_name} (${p.email_address})`);
      });
    }
  } catch (error) {
    console.error('❌ Error verifying prospects:', error);
  }
}

async function testAutomation() {
  try {
    console.log('\n🤖 Testing automation endpoint...');
    const response = await fetch('http://localhost:3000/api/campaigns/automation/process-pending', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    });
    
    const data = await response.json();
    console.log('✅ Automation response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data.length > 0) {
      console.log('🎉 SUCCESS! Campaign now appears in automation!');
    } else {
      console.log('⚠️ Campaign created but still missing required components:');
      console.log('   - Campaign Settings (sending schedule, limits)');
      console.log('   - Campaign Sequences (email templates)'); 
      console.log('   - Campaign Senders (connected email accounts)');
      console.log('');
      console.log('Configure these in your campaign dashboard to complete setup.');
    }
    
  } catch (error) {
    console.error('❌ Automation test failed:', error);
  }
}

createMissingCampaign();