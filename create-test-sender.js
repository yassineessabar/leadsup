// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createTestSender() {
  console.log('🔧 Creating Test Sender for Webhook Testing\n')
  
  // Use an existing campaign
  const existingCampaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4' // TEST FRERO
  const testSenderEmail = 'test@reply.leadsup.io'
  
  try {
    // Get campaign details
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id, name')
      .eq('id', existingCampaignId)
      .single()
    
    if (!campaign) {
      console.log('❌ Campaign not found')
      return
    }
    
    console.log(`📋 Using campaign: ${campaign.name}`)
    console.log(`   Campaign ID: ${existingCampaignId}`)
    console.log(`   User ID: ${campaign.user_id}`)
    
    // Create or update campaign sender for the test domain
    const { data: sender, error } = await supabase
      .from('campaign_senders')
      .upsert({
        campaign_id: existingCampaignId,
        user_id: campaign.user_id,
        email: testSenderEmail,
        name: 'SendGrid Test Sender',
        is_active: true
      }, {
        onConflict: 'campaign_id,email'
      })
      .select()
      .single()
    
    if (error) {
      console.log('❌ Error creating sender:', error.message)
    } else {
      console.log('✅ Test sender created/updated')
      console.log(`   Email: ${testSenderEmail}`)
      
      // Save config for webhook test
      const fs = require('fs')
      const config = {
        campaignId: existingCampaignId,
        senderEmail: testSenderEmail,
        userId: campaign.user_id,
        campaignName: campaign.name
      }
      
      fs.writeFileSync('webhook-test-config.json', JSON.stringify(config, null, 2))
      console.log('\n✅ Configuration saved to webhook-test-config.json')
      
      console.log('\n🧪 Now you can test:')
      console.log('1. node test-webhook-direct.js (will use this sender)')
      console.log('2. The webhook should process successfully')
      console.log('3. node check-inbox-replies.js (to verify capture)')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createTestSender()