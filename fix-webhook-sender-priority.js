#!/usr/bin/env node

/**
 * Fix webhook sender priority to ensure correct user ID is used
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixWebhookSenderPriority() {
  try {
    console.log('🔧 Fixing webhook sender priority\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const webhookEmail = 'test@reply.leadsup.io'
    
    // 1. Check all webhook senders
    console.log('1. All webhook senders:')
    console.log('=' .repeat(50))
    
    const { data: allSenders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('email', webhookEmail)
      .order('created_at', { ascending: true })
    
    if (senderError) {
      console.error('❌ Error:', senderError)
      return
    }
    
    console.log(`🔗 Found ${allSenders.length} webhook senders:`)
    allSenders.forEach((sender, i) => {
      const userMatch = sender.user_id === correctUserId ? '✅ CORRECT' : '❌ WRONG'
      console.log(`${i + 1}. Campaign: ${sender.campaign_id}`)
      console.log(`   User: ${sender.user_id} ${userMatch}`)
      console.log(`   Created: ${new Date(sender.created_at).toLocaleTimeString()}`)
      console.log(`   Active: ${sender.is_active}`)
      console.log('')
    })
    
    // 2. The webhook picks the first one returned, so we need to ensure correct one is first
    const correctSender = allSenders.find(s => s.user_id === correctUserId)
    const wrongSenders = allSenders.filter(s => s.user_id !== correctUserId)
    
    if (!correctSender) {
      console.log('❌ No webhook sender with correct user ID found!')
      return
    }
    
    if (wrongSenders.length === 0) {
      console.log('✅ Only correct webhook sender exists!')
      return
    }
    
    console.log('2. Fixing webhook sender priority:')
    console.log('=' .repeat(50))
    
    // Delete wrong senders to ensure correct one is always picked
    for (const wrongSender of wrongSenders) {
      console.log(`🗑️ Deleting wrong sender: Campaign ${wrongSender.campaign_id}, User ${wrongSender.user_id}`)
      
      const { error: deleteError } = await supabase
        .from('campaign_senders')
        .delete()
        .eq('id', wrongSender.id)
      
      if (deleteError) {
        console.error(`  ❌ Delete error:`, deleteError)
      } else {
        console.log(`  ✅ Deleted`)
      }
    }
    
    // 3. Verify webhook sender
    console.log('\n3. Verifying webhook sender:')
    console.log('=' .repeat(50))
    
    const { data: finalSenders, error: finalError } = await supabase
      .from('campaign_senders')
      .select('user_id, campaign_id, email')
      .eq('email', webhookEmail)
    
    if (finalError) {
      console.error('❌ Final check error:', finalError)
    } else {
      console.log(`🔗 Remaining webhook senders: ${finalSenders.length}`)
      finalSenders.forEach((sender, i) => {
        console.log(`${i + 1}. User: ${sender.user_id} ${sender.user_id === correctUserId ? '✅' : '❌'}`)
        console.log(`   Campaign: ${sender.campaign_id}`)
      })
      
      if (finalSenders.length === 1 && finalSenders[0].user_id === correctUserId) {
        console.log('\n🎉 WEBHOOK SENDER FIXED!')
        console.log('📧 Future replies will use correct user ID automatically')
      } else {
        console.log('\n❌ Issue still exists')
      }
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixWebhookSenderPriority()