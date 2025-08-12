#!/usr/bin/env node

/**
 * Check user IDs in captured messages vs frontend user ID
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkUserIds() {
  try {
    console.log('🔍 Checking user ID mismatch\n')
    
    // 1. Check user IDs in captured messages
    console.log('1. User IDs in captured messages:')
    console.log('=' .repeat(50))
    const { data: messages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('user_id, contact_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (msgError) {
      console.error('❌ Error:', msgError)
      return
    }
    
    const userIds = [...new Set(messages.map(m => m.user_id))]
    console.log(`📧 Found ${messages.length} messages from ${userIds.length} users:`)
    userIds.forEach((uid, i) => {
      const count = messages.filter(m => m.user_id === uid).length
      console.log(`${i + 1}. ${uid} (${count} messages)`)
    })
    
    // 2. Check user IDs in campaigns
    console.log('\n2. User IDs in campaigns:')
    console.log('=' .repeat(50))
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('user_id, name, id')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (campError) {
      console.error('❌ Error:', campError)
    } else {
      const campaignUserIds = [...new Set(campaigns.map(c => c.user_id))]
      console.log(`📋 Found ${campaigns.length} campaigns from ${campaignUserIds.length} users:`)
      campaignUserIds.forEach((uid, i) => {
        const count = campaigns.filter(c => c.user_id === uid).length
        console.log(`${i + 1}. ${uid} (${count} campaigns)`)
      })
    }
    
    // 3. Check specific campaign that sent the reply
    console.log('\n3. Checking Test campaign user:')
    console.log('=' .repeat(50))
    const { data: testCampaign, error: testError } = await supabase
      .from('campaigns')
      .select('user_id, name')
      .eq('id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .single()
    
    if (testError) {
      console.error('❌ Error:', testError)
    } else {
      console.log(`📋 Test campaign belongs to user: ${testCampaign.user_id}`)
    }
    
    // 4. Analysis
    console.log('\n4. Analysis:')
    console.log('=' .repeat(50))
    console.log('🚨 FRONTEND USER: 1ecada7a-a538-4ee5-a193-14f5c482f387')
    console.log('📧 MESSAGES USER: 6dae1cdc-2dbc-44ce-9145-4584981eef44') 
    console.log('')
    console.log('❌ PROBLEM: Different user IDs!')
    console.log('🔧 SOLUTION OPTIONS:')
    console.log('   1. Update captured messages to use frontend user ID')
    console.log('   2. Check why frontend has different user ID')
    console.log('   3. Update webhook to get correct user ID from campaign')
    
    // 5. Check if we can fix by updating messages
    console.log('\n5. Proposed fix - Update message user_ids:')
    console.log('=' .repeat(50))
    const frontendUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const messagesUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    console.log(`✅ Update inbox_messages user_id from ${messagesUserId} to ${frontendUserId}`)
    console.log(`✅ Update inbox_threads user_id from ${messagesUserId} to ${frontendUserId}`)
    console.log('')
    console.log('🚨 This will make all captured replies appear in your inbox!')
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkUserIds()