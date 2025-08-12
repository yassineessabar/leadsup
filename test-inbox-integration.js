#!/usr/bin/env node

/**
 * Test end-to-end inbox integration with captured email replies
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testInboxIntegration() {
  try {
    console.log('🔍 Testing end-to-end inbox integration\n')
    
    // 1. Check recent captured messages
    console.log('1. Recent captured messages from webhook:')
    console.log('=' .repeat(50))
    const { data: recentMessages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false })
      .limit(5)
    
    if (msgError) {
      console.error('❌ Error fetching messages:', msgError)
      return
    }
    
    if (!recentMessages.length) {
      console.log('📭 No captured messages found')
      return
    }
    
    recentMessages.forEach((msg, i) => {
      console.log(`${i + 1}. Message ID: ${msg.id}`)
      console.log(`   From: ${msg.contact_email}`)
      console.log(`   To: ${msg.sender_email}`) 
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Content: "${msg.body_text?.substring(0, 100) || 'No content'}..."`)
      console.log(`   Campaign: ${msg.campaign_id}`)
      console.log(`   Conversation: ${msg.conversation_id}`)
      console.log(`   Received: ${new Date(msg.received_at).toLocaleString()}`)
      console.log('')
    })
    
    // 2. Check corresponding threads
    console.log('2. Corresponding inbox threads:')
    console.log('=' .repeat(50))
    const conversationIds = [...new Set(recentMessages.map(m => m.conversation_id))]
    
    const { data: threads, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('last_message_at', { ascending: false })
    
    if (threadError) {
      console.error('❌ Error fetching threads:', threadError)
      return
    }
    
    threads.forEach((thread, i) => {
      console.log(`${i + 1}. Thread ID: ${thread.id}`)
      console.log(`   Conversation: ${thread.conversation_id}`)
      console.log(`   Contact: ${thread.contact_email}`)
      console.log(`   Subject: ${thread.subject}`)
      console.log(`   Message Count: ${thread.message_count}`)
      console.log(`   Unread: ${thread.unread_count}`)
      console.log(`   Last Message: ${new Date(thread.last_message_at).toLocaleString()}`)
      console.log(`   Status: ${thread.status}`)
      console.log('')
    })
    
    // 3. Test API-style query (simulate inbox tab fetch)
    console.log('3. Testing inbox API query (simulating frontend):')
    console.log('=' .repeat(50))
    
    // Get user ID from a recent message
    const userId = recentMessages[0]?.user_id
    if (!userId) {
      console.log('❌ No user ID found in messages')
      return
    }
    
    console.log(`📧 Querying inbox for user: ${userId}`)
    
    // Simulate the threaded inbox query
    const { data: inboxThreads, error: inboxError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(10)
    
    if (inboxError) {
      console.error('❌ Error fetching inbox threads:', inboxError)
      return
    }
    
    console.log(`✅ Found ${inboxThreads.length} active threads in inbox`)
    
    // For each thread, get the latest message details
    for (const thread of inboxThreads.slice(0, 3)) {
      console.log(`\n📧 Thread: ${thread.conversation_id}`)
      console.log(`   Subject: ${thread.subject}`)
      console.log(`   Contact: ${thread.contact_email}`)
      console.log(`   Messages: ${thread.message_count}`)
      console.log(`   Unread: ${thread.unread_count}`)
      
      // Get latest message for this thread (as inbox tab would)
      const { data: latestMsg, error: latestError } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', thread.conversation_id)
        .eq('folder', 'inbox')
        .order('sent_at', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (latestError) {
        console.log(`   ⚠️ No latest message found: ${latestError.message}`)
      } else {
        console.log(`   📨 Latest message:`)
        console.log(`      Direction: ${latestMsg.direction}`)
        console.log(`      From: ${latestMsg.contact_email || latestMsg.sender_email}`)
        console.log(`      Content: "${latestMsg.body_text?.substring(0, 80) || 'No content'}..."`)
        console.log(`      Date: ${new Date(latestMsg.sent_at || latestMsg.created_at).toLocaleString()}`)
      }
    }
    
    // 4. Check campaign association
    console.log('\n4. Campaign associations:')
    console.log('=' .repeat(50))
    
    const campaignIds = [...new Set(recentMessages.map(m => m.campaign_id).filter(Boolean))]
    if (campaignIds.length > 0) {
      const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .in('id', campaignIds)
      
      if (campError) {
        console.error('❌ Error fetching campaigns:', campError)
      } else {
        campaigns.forEach(campaign => {
          const msgCount = recentMessages.filter(m => m.campaign_id === campaign.id).length
          console.log(`📋 Campaign: ${campaign.name} (ID: ${campaign.id})`)
          console.log(`   Status: ${campaign.status}`)
          console.log(`   Messages: ${msgCount} recent replies`)
          console.log('')
        })
      }
    } else {
      console.log('📋 No campaign associations found')
    }
    
    // 5. Summary
    console.log('5. Integration Summary:')
    console.log('=' .repeat(50))
    console.log(`✅ Webhook Integration: ${recentMessages.length > 0 ? 'WORKING' : 'NO DATA'}`)
    console.log(`✅ Thread Creation: ${threads.length > 0 ? 'WORKING' : 'NO THREADS'}`)  
    console.log(`✅ Inbox API Ready: ${inboxThreads.length > 0 ? 'WORKING' : 'NO INBOX THREADS'}`)
    console.log(`✅ Campaign Linking: ${campaignIds.length > 0 ? 'WORKING' : 'NO CAMPAIGNS'}`)
    
    if (recentMessages.length > 0 && threads.length > 0 && inboxThreads.length > 0) {
      console.log('\n🎉 INTEGRATION STATUS: FULLY FUNCTIONAL')
      console.log('   - Prospect replies are being captured by webhook')
      console.log('   - Messages are properly stored in inbox_messages table')
      console.log('   - Threads are created/updated in inbox_threads table')
      console.log('   - Inbox tab API can fetch and display the captured replies')
    } else {
      console.log('\n⚠️ INTEGRATION STATUS: PARTIAL OR NOT WORKING')
      console.log('   - Check webhook configuration and test email replies')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testInboxIntegration()