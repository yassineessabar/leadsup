#!/usr/bin/env node

/**
 * Debug why webhook is using wrong user ID
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugWebhookUserId() {
  try {
    console.log('🔍 Debugging webhook user ID issue\n')
    
    // The webhook should be looking for campaign_senders with email "test@reply.leadsup.io"
    const webhookEmail = 'test@reply.leadsup.io'
    
    console.log('1. Checking campaign_senders table:')
    console.log('=' .repeat(50))
    console.log(`🔍 Looking for campaign_senders with email: "${webhookEmail}"`)
    
    const { data: campaignSenders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('id, user_id, campaign_id, email, name')
      .eq('email', webhookEmail)
    
    if (senderError) {
      console.error('❌ Error:', senderError)
      return
    }
    
    console.log(`📊 Found ${campaignSenders.length} campaign senders:`)
    campaignSenders.forEach((sender, i) => {
      console.log(`${i + 1}. Campaign: ${sender.campaign_id}`)
      console.log(`   User: ${sender.user_id}`)
      console.log(`   Email: ${sender.email}`)
      console.log(`   Name: ${sender.name}`)
      console.log('')
    })
    
    if (campaignSenders.length === 0) {
      console.log('❌ PROBLEM FOUND: No campaign_senders with test@reply.leadsup.io!')
      console.log('🔧 SOLUTION: The webhook can\'t find the right campaign')
      console.log('')
      console.log('Let\'s check what senders exist for recent campaigns:')
      
      // Check recent campaign senders
      const { data: recentSenders, error: recentError } = await supabase
        .from('campaign_senders')
        .select('id, user_id, campaign_id, email, name, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (recentError) {
        console.error('❌ Recent senders error:', recentError)
        return
      }
      
      console.log(`📊 Recent campaign senders:`)
      recentSenders.forEach((sender, i) => {
        console.log(`${i + 1}. ${sender.email} - Campaign: ${sender.campaign_id}`)
        console.log(`   User: ${sender.user_id}`)
        console.log(`   Created: ${new Date(sender.created_at).toLocaleTimeString()}`)
        console.log('')
      })
      
    } else {
      // Check if the found senders have the right user ID
      const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
      const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
      
      const correctSenders = campaignSenders.filter(s => s.user_id === correctUserId)
      const wrongSenders = campaignSenders.filter(s => s.user_id === wrongUserId)
      
      console.log('2. User ID analysis:')
      console.log('=' .repeat(50))
      console.log(`✅ Correct user senders: ${correctSenders.length}`)
      console.log(`❌ Wrong user senders: ${wrongSenders.length}`)
      
      if (wrongSenders.length > 0) {
        console.log('\n❌ PROBLEM: campaign_senders has wrong user_id!')
        console.log('🔧 SOLUTION: Update campaign_senders to use correct user_id')
      }
    }
    
    // 3. Check webhook logic would do
    console.log('\n3. Simulating webhook logic:')
    console.log('=' .repeat(50))
    
    if (campaignSenders.length > 0) {
      const firstSender = campaignSenders[0]
      console.log('🤖 Webhook would use:')
      console.log(`   Campaign: ${firstSender.campaign_id}`)
      console.log(`   User ID: ${firstSender.user_id}`)
      console.log(`   ✅ Correct: ${firstSender.user_id === '1ecada7a-a538-4ee5-a193-14f5c482f387' ? 'YES' : 'NO'}`)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugWebhookUserId()