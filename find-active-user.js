#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findActiveUser() {
  console.log('🔍 Finding the active user with campaigns and emails...\n')
  
  try {
    // 1. Find users with campaigns
    const { data: campaignUsers, error: campaignError } = await supabase
      .from('campaigns')
      .select('user_id, id, name')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('📋 Recent campaigns and their users:')
    if (campaignError) {
      console.log('❌ Error:', campaignError)
      return
    }
    
    if (!campaignUsers || campaignUsers.length === 0) {
      console.log('⚠️ No campaigns found')
      return
    }
    
    // Group by user
    const userCampaigns = {}
    campaignUsers.forEach(campaign => {
      if (!userCampaigns[campaign.user_id]) {
        userCampaigns[campaign.user_id] = []
      }
      userCampaigns[campaign.user_id].push(campaign)
    })
    
    // Find the user with the most campaigns (likely the active one)
    const activeUserId = Object.keys(userCampaigns).reduce((a, b) => 
      userCampaigns[a].length > userCampaigns[b].length ? a : b
    )
    
    console.log(`👤 Most active user ID: ${activeUserId}`)
    console.log(`📊 Campaigns: ${userCampaigns[activeUserId].length}`)
    
    userCampaigns[activeUserId].forEach((campaign, i) => {
      console.log(`   ${i + 1}. ${campaign.name} (${campaign.id})`)
    })
    
    // 2. Check this user's inbox messages
    const { data: userMessages, error: messageError } = await supabase
      .from('inbox_messages')
      .select('direction, sender_email, contact_email, created_at, campaign_id')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`\n📧 Inbox messages for user ${activeUserId}:`)
    if (messageError) {
      console.log('❌ Error:', messageError)
    } else if (userMessages && userMessages.length > 0) {
      console.log(`✅ Found ${userMessages.length} messages`)
      userMessages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.direction} - ${msg.sender_email} → ${msg.contact_email} (Campaign: ${msg.campaign_id || 'N/A'})`)
      })
      
      // Count outbound vs inbound
      const outbound = userMessages.filter(m => m.direction === 'outbound').length
      const inbound = userMessages.filter(m => m.direction === 'inbound').length
      
      console.log(`\n📊 Message breakdown:`)
      console.log(`   📤 Outbound (sent): ${outbound}`)
      console.log(`   📥 Inbound (received): ${inbound}`)
      
    } else {
      console.log('⚠️ No messages found for this user')
    }
    
    // 3. Check SendGrid events for this user
    const { data: userEvents, error: eventError } = await supabase
      .from('sendgrid_events')
      .select('*')
      .eq('user_id', activeUserId)
      .limit(5)
    
    console.log(`\n📊 SendGrid events for user ${activeUserId}:`)
    if (eventError) {
      console.log('❌ Error:', eventError)
    } else if (userEvents && userEvents.length > 0) {
      console.log(`✅ Found ${userEvents.length} SendGrid events`)
      userEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.event_type} - ${event.email}`)
      })
    } else {
      console.log('⚠️ No SendGrid events found for this user')
    }
    
    console.log('\n🎯 SOLUTION:')
    console.log(`Active user: ${activeUserId}`)
    console.log('For user-specific metrics, we should:')
    if (userMessages && userMessages.length > 0) {
      console.log('✅ Use inbox_messages table filtered by user_id')
      console.log(`✅ User has ${outbound} sent emails to analyze`)
    }
    if (userEvents && userEvents.length > 0) {
      console.log('✅ Use sendgrid_events table filtered by user_id')
    }
    if (!userEvents || userEvents.length === 0) {
      console.log('⚠️ No SendGrid webhook events - must use inbox_messages data')
      console.log('💡 Calculate metrics from inbox_messages.direction="outbound"')
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
  }
}

findActiveUser().catch(console.error)