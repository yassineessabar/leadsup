require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createReplySender() {
  console.log('🔧 Creating Reply Domain Sender\n')
  
  // Use the existing campaign that has senders
  const existingCampaignId = 'c6639718-2120-4548-9063-ab89c04c9804'
  const replySenderEmail = 'test@reply.leadsup.io'
  
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
    
    console.log(`📋 Adding sender to campaign: ${campaign.name}`)
    console.log(`   Campaign ID: ${existingCampaignId}`)
    console.log(`   User ID: ${campaign.user_id}`)
    
    // Create campaign sender for the reply domain
    const { data: sender, error } = await supabase
      .from('campaign_senders')
      .upsert({
        campaign_id: existingCampaignId,
        user_id: campaign.user_id,
        email: replySenderEmail,
        name: 'Reply Domain Sender',
        is_active: true
      }, {
        onConflict: 'campaign_id,email'
      })
      .select()
      .single()
    
    if (error) {
      console.log('❌ Error creating sender:', error.message)
    } else {
      console.log('✅ Reply domain sender created/updated')
      console.log(`   Email: ${replySenderEmail}`)
      console.log('\n✅ Now replies to test@reply.leadsup.io will be captured!')
      
      console.log('\n🧪 Next steps:')
      console.log('1. Your previous reply is lost (already sent to unconfigured domain)')
      console.log('2. Send a new test email: node test-send-real-email.js essabar.yassine@gmail.com')
      console.log('3. Reply to the NEW email')
      console.log('4. Check: node check-inbox-replies.js')
      
      console.log('\n⚠️  Important: For production, you need to:')
      console.log('   - Configure MX records for reply.leadsup.io to point to SendGrid')
      console.log('   - Without MX records, replies will bounce or be lost')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createReplySender()