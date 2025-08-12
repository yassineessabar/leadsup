#!/usr/bin/env node

/**
 * Check if the campaign reply is now properly fixed
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkCampaignReplyFix() {
  try {
    console.log('🔍 Checking campaign reply fix status\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const conversationId = 'YW50aG95MjMyN0BnbWFpbC5jb218dGVz'
    
    // 1. Check the campaign reply message
    console.log('1. Campaign reply message:')
    console.log('=' .repeat(50))
    const { data: replyMessage, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('contact_email', 'anthoy2327@gmail.com')
      .eq('conversation_id', conversationId)
      .single()
    
    if (msgError) {
      console.error('❌ Reply message error:', msgError)
      return
    }
    
    console.log(`📧 Reply Message:`)
    console.log(`   From: ${replyMessage.contact_email}`)
    console.log(`   Subject: ${replyMessage.subject}`)
    console.log(`   User ID: ${replyMessage.user_id}`)
    console.log(`   Conversation: ${replyMessage.conversation_id}`)
    console.log(`   ✅ Correct User: ${replyMessage.user_id === correctUserId ? 'YES' : 'NO'}`)
    
    // 2. Check the thread
    console.log('\n2. Campaign reply thread:')
    console.log('=' .repeat(50))
    const { data: replyThread, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('conversation_id', conversationId)
    
    if (threadError) {
      console.error('❌ Thread error:', threadError)
      return
    }
    
    console.log(`🧵 Found ${replyThread.length} threads with this conversation ID:`)
    replyThread.forEach((thread, i) => {
      console.log(`${i + 1}. User: ${thread.user_id} - Contact: ${thread.contact_email}`)
      console.log(`   ✅ Correct User: ${thread.user_id === correctUserId ? 'YES' : 'NO'}`)
    })
    
    // 3. Test inbox API query simulation for this specific user
    console.log('\n3. Testing inbox API query for correct user:')
    console.log('=' .repeat(50))
    
    // Get messages in inbox folder for correct user
    const { data: inboxMessages, error: inboxError } = await supabase
      .from('inbox_messages')
      .select('conversation_id, contact_email, subject')
      .eq('user_id', correctUserId)
      .eq('folder', 'inbox')
      .eq('channel', 'email')
    
    if (inboxError) {
      console.error('❌ Inbox query error:', inboxError)
      return
    }
    
    const threadIds = [...new Set(inboxMessages.map(m => m.conversation_id))]
    console.log(`📁 Messages in inbox folder: ${inboxMessages.length}`)
    console.log(`📁 Unique threads: ${threadIds.length}`)
    console.log(`📁 Our thread included: ${threadIds.includes(conversationId) ? 'YES ✅' : 'NO ❌'}`)
    
    if (threadIds.includes(conversationId)) {
      // Get threads query
      const { data: threads, error: threadsError } = await supabase
        .from('inbox_threads')
        .select('*')
        .eq('user_id', correctUserId)
        .in('conversation_id', threadIds)
        .order('last_message_at', { ascending: false })
        .limit(5)
      
      if (threadsError) {
        console.error('❌ Threads query error:', threadsError)
        return
      }
      
      console.log(`🧵 Threads query returned: ${threads.length} threads`)
      const ourThread = threads.find(t => t.conversation_id === conversationId)
      console.log(`🧵 Our thread in results: ${ourThread ? 'YES ✅' : 'NO ❌'}`)
      
      if (ourThread) {
        console.log('\n🎉 SUCCESS: Campaign reply should now appear in inbox!')
        console.log('📱 Refresh your inbox tab to see it!')
      }
    }
    
    // 4. Final summary
    console.log('\n4. Summary:')
    console.log('=' .repeat(50))
    if (replyMessage.user_id === correctUserId && threadIds.includes(conversationId)) {
      console.log('✅ FIXED: Campaign reply has correct user ID and appears in inbox query')
      console.log('📱 The reply should now be visible in your inbox tab')
    } else {
      console.log('❌ ISSUE: Still has problems')
      if (replyMessage.user_id !== correctUserId) {
        console.log('   • Message has wrong user ID')
      }
      if (!threadIds.includes(conversationId)) {
        console.log('   • Thread not in inbox query results')
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkCampaignReplyFix()