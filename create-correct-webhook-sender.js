#!/usr/bin/env node

/**
 * Create correct webhook sender for the right user's campaigns
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createCorrectWebhookSender() {
  try {
    console.log('🔧 Creating correct webhook sender\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const webhookEmail = 'test@reply.leadsup.io'
    
    // 1. Find campaigns that belong to the correct user
    console.log('1. Finding campaigns for correct user:')
    console.log('=' .repeat(50))
    
    const { data: userCampaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, user_id')
      .eq('user_id', correctUserId)
      .order('created_at', { ascending: false })
    
    if (campaignError) {
      console.error('❌ Error:', campaignError)
      return
    }
    
    console.log(`📋 Found ${userCampaigns.length} campaigns for correct user:`)
    userCampaigns.forEach((campaign, i) => {
      console.log(`${i + 1}. ${campaign.name} (${campaign.id})`)
    })
    
    if (userCampaigns.length === 0) {
      console.log('❌ No campaigns found for correct user!')
      return
    }
    
    // 2. Use the most recent campaign
    const targetCampaign = userCampaigns[0]
    console.log(`\n✅ Using campaign: "${targetCampaign.name}" (${targetCampaign.id})`)
    
    // 3. Check if webhook sender already exists for this campaign
    console.log('\n2. Checking existing webhook sender:')
    console.log('=' .repeat(50))
    
    const { data: existingSender, error: existingError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', targetCampaign.id)
      .eq('email', webhookEmail)
      .single()
    
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing:', existingError)
    }
    
    if (existingSender) {
      console.log(`✅ Webhook sender already exists for this campaign`)
      console.log(`   User: ${existingSender.user_id}`)
      console.log(`   Email: ${existingSender.email}`)
    } else {
      console.log('❌ No webhook sender for this campaign')
      
      // 4. Create webhook sender for the correct campaign
      console.log('\n3. Creating webhook sender:')
      console.log('=' .repeat(50))
      
      const { data: newSender, error: createError } = await supabase
        .from('campaign_senders')
        .insert({
          user_id: correctUserId,
          campaign_id: targetCampaign.id,
          email: webhookEmail,
          name: 'Reply Webhook',
          is_active: true,
          health_score: 100,
          daily_limit: 1000,
          auth_type: 'webhook'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Create error:', createError)
        return
      }
      
      console.log('✅ Created webhook sender:')
      console.log(`   ID: ${newSender.id}`)
      console.log(`   Campaign: ${newSender.campaign_id}`)
      console.log(`   User: ${newSender.user_id}`)
      console.log(`   Email: ${newSender.email}`)
    }
    
    // 4. Verify webhook will now work
    console.log('\n4. Verifying webhook lookup:')
    console.log('=' .repeat(50))
    
    const { data: webhookSenders, error: webhookError } = await supabase
      .from('campaign_senders')
      .select('user_id, campaign_id, email')
      .eq('email', webhookEmail)
      .eq('user_id', correctUserId)
    
    if (webhookError) {
      console.error('❌ Webhook lookup error:', webhookError)
      return
    }
    
    console.log(`🔍 Webhook senders for correct user: ${webhookSenders.length}`)
    if (webhookSenders.length > 0) {
      console.log('✅ Webhook will now use correct user ID!')
      
      // 5. Also fix existing captured replies
      console.log('\n5. Fixing existing captured replies:')
      console.log('=' .repeat(50))
      
      const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
      
      // Update recent messages with wrong user ID
      const { data: fixedMessages, error: fixMsgError } = await supabase
        .from('inbox_messages')
        .update({ user_id: correctUserId })
        .eq('user_id', wrongUserId)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .select('id')
      
      if (fixMsgError) {
        console.error('❌ Fix messages error:', fixMsgError)
      } else {
        console.log(`✅ Fixed ${fixedMessages.length} recent messages`)
      }
      
      // Update recent threads with wrong user ID  
      const { data: fixedThreads, error: fixThreadError } = await supabase
        .from('inbox_threads')
        .update({ user_id: correctUserId })
        .eq('user_id', wrongUserId)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .select('id')
      
      if (fixThreadError) {
        console.error('❌ Fix threads error:', fixThreadError)
      } else {
        console.log(`✅ Fixed ${fixedThreads.length} recent threads`)
      }
      
      console.log('\n🎉 COMPLETE FIX APPLIED!')
      console.log('📧 Future replies will use correct user ID')
      console.log('📧 Recent replies have been fixed')
      console.log('📱 Refresh your inbox - replies should now appear!')
      
    } else {
      console.log('❌ Still no webhook senders for correct user')
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

createCorrectWebhookSender()