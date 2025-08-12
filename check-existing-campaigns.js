// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkExistingData() {
  console.log('🔍 Checking Existing Database Structure\n')
  
  try {
    // Check campaigns
    console.log('📊 Existing Campaigns:')
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(5)
    
    if (campaignError) {
      console.log('❌ Campaign error:', campaignError.message)
    } else if (campaigns && campaigns.length > 0) {
      console.log(`Found ${campaigns.length} campaigns:`)
      campaigns.forEach(campaign => {
        console.log(`   • ID: ${campaign.id} | Name: ${campaign.name}`)
      })
    } else {
      console.log('No campaigns found')
    }
    
    // Check campaign_senders
    console.log('\n📧 Existing Campaign Senders:')
    const { data: senders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .limit(5)
    
    if (senderError) {
      console.log('❌ Sender error:', senderError.message)
    } else if (senders && senders.length > 0) {
      console.log(`Found ${senders.length} senders:`)
      senders.forEach(sender => {
        console.log(`   • Email: ${sender.email} | Campaign: ${sender.campaign_id}`)
      })
    } else {
      console.log('No campaign senders found')
    }
    
    // Check recent inbox messages
    console.log('\n📥 Recent Inbox Messages:')
    const { data: messages, error: messageError } = await supabase
      .from('inbox_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (messageError) {
      console.log('❌ Message error:', messageError.message)
    } else if (messages && messages.length > 0) {
      console.log(`Found ${messages.length} recent messages:`)
      messages.forEach(msg => {
        console.log(`   • From: ${msg.contact_email} | Direction: ${msg.direction} | Subject: ${msg.subject}`)
      })
    } else {
      console.log('No messages found')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkExistingData()