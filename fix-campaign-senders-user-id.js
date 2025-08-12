#!/usr/bin/env node

/**
 * Fix campaign_senders user_id to match correct user
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixCampaignSendersUserId() {
  try {
    console.log('🔧 Fixing campaign_senders user_id\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    const webhookEmail = 'test@reply.leadsup.io'
    
    // 1. Check current state
    console.log('1. Current campaign_senders for webhook email:')
    console.log('=' .repeat(50))
    
    const { data: currentSenders, error: currentError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('email', webhookEmail)
    
    if (currentError) {
      console.error('❌ Error:', currentError)
      return
    }
    
    console.log(`📊 Found ${currentSenders.length} senders:`)
    currentSenders.forEach((sender, i) => {
      console.log(`${i + 1}. Campaign: ${sender.campaign_id}`)
      console.log(`   User: ${sender.user_id} ${sender.user_id === correctUserId ? '✅' : '❌'}`)
      console.log(`   Email: ${sender.email}`)
      console.log(`   Name: ${sender.name}`)
      console.log('')
    })
    
    // 2. Check what campaigns belong to the correct user
    console.log('2. Checking campaign ownership:')
    console.log('=' .repeat(50))
    
    for (const sender of currentSenders) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('user_id, name')
        .eq('id', sender.campaign_id)
        .single()
      
      if (campaignError) {
        console.error(`❌ Campaign ${sender.campaign_id} error:`, campaignError)
        continue
      }
      
      console.log(`📋 Campaign ${sender.campaign_id}: "${campaign.name}"`)
      console.log(`   Campaign user_id: ${campaign.user_id}`)
      console.log(`   Sender user_id: ${sender.user_id}`)
      console.log(`   Match: ${campaign.user_id === sender.user_id ? '✅' : '❌'}`)
      console.log('')
      
      // If campaign belongs to correct user but sender doesn't, update it
      if (campaign.user_id === correctUserId && sender.user_id !== correctUserId) {
        console.log(`🔧 Updating sender ${sender.id} to correct user_id...`)
        
        const { error: updateError } = await supabase
          .from('campaign_senders')
          .update({ user_id: correctUserId })
          .eq('id', sender.id)
        
        if (updateError) {
          console.error(`❌ Update error:`, updateError)
        } else {
          console.log(`✅ Updated sender ${sender.id}`)
        }
      }
    }
    
    // 3. Verify fix
    console.log('\n3. Verifying fix:')
    console.log('=' .repeat(50))
    
    const { data: updatedSenders, error: verifyError } = await supabase
      .from('campaign_senders')
      .select('user_id, campaign_id, email')
      .eq('email', webhookEmail)
    
    if (verifyError) {
      console.error('❌ Verify error:', verifyError)
      return
    }
    
    console.log(`📊 Updated senders:`)
    updatedSenders.forEach((sender, i) => {
      console.log(`${i + 1}. Campaign: ${sender.campaign_id}`)
      console.log(`   User: ${sender.user_id} ${sender.user_id === correctUserId ? '✅ CORRECT' : '❌ WRONG'}`)
    })
    
    const correctCount = updatedSenders.filter(s => s.user_id === correctUserId).length
    const wrongCount = updatedSenders.filter(s => s.user_id !== correctUserId).length
    
    console.log(`\n📊 Summary:`)
    console.log(`✅ Correct user senders: ${correctCount}`)
    console.log(`❌ Wrong user senders: ${wrongCount}`)
    
    if (wrongCount === 0) {
      console.log('\n🎉 SUCCESS: All webhook senders now have correct user_id!')
      console.log('📧 Future replies will be captured with correct user_id')
      console.log('🔄 Now let\'s fix the existing captured replies...')
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixCampaignSendersUserId()