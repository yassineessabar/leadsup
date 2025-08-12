#!/usr/bin/env node

/**
 * Fix the actual reply messages directly
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixReplyMessagesDirectly() {
  try {
    console.log('🔧 Fixing reply messages directly\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    // 1. Find the actual reply messages (direction = inbound)
    console.log('1. Finding reply messages:')
    console.log('=' .repeat(50))
    
    const { data: replyMessages, error: replyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .eq('user_id', wrongUserId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
    
    if (replyError) {
      console.error('❌ Error:', replyError)
      return
    }
    
    console.log(`📧 Found ${replyMessages.length} reply messages:`)
    replyMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.contact_email} → ${msg.sender_email}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Conversation: ${msg.conversation_id}`)
      console.log(`   User: ${msg.user_id}`)
      console.log('')
    })
    
    if (replyMessages.length === 0) {
      console.log('✅ No reply messages to fix!')
      return
    }
    
    // 2. Fix each reply message
    for (const message of replyMessages) {
      console.log(`Fixing reply: ${message.contact_email} (${message.conversation_id})`)
      
      // Ensure thread exists for correct user
      const { error: threadError } = await supabase
        .from('inbox_threads')
        .upsert({
          user_id: correctUserId,
          conversation_id: message.conversation_id,
          contact_email: message.contact_email,
          contact_name: message.contact_name || message.contact_email,
          subject: message.subject,
          last_message_at: message.received_at || message.created_at,
          last_message_preview: message.body_text?.substring(0, 150) || 'Reply captured',
          message_count: 1,
          unread_count: 1,
          status: 'active',
          campaign_id: message.campaign_id
        }, {
          onConflict: 'conversation_id,user_id'
        })
      
      if (threadError) {
        console.error(`  ❌ Thread error:`, threadError)
        continue
      } else {
        console.log(`  ✅ Thread ensured for correct user`)
      }
      
      // Update message user_id
      const { error: updateError } = await supabase
        .from('inbox_messages')
        .update({ user_id: correctUserId })
        .eq('id', message.id)
      
      if (updateError) {
        console.error(`  ❌ Update message error:`, updateError)
      } else {
        console.log(`  ✅ Message updated to correct user`)
      }
      
      // Delete old thread if it exists
      const { error: deleteError } = await supabase
        .from('inbox_threads')
        .delete()
        .eq('conversation_id', message.conversation_id)
        .eq('user_id', wrongUserId)
      
      if (deleteError) {
        console.log(`  ⚠️ Delete old thread: ${deleteError.message}`)
      }
    }
    
    // 3. Verify fix
    console.log('\n3. Verifying fix:')
    console.log('=' .repeat(50))
    
    const { data: fixedReplies, error: fixedError } = await supabase
      .from('inbox_messages')
      .select('contact_email, subject, user_id, conversation_id')
      .eq('direction', 'inbound')
      .eq('user_id', correctUserId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    if (fixedError) {
      console.error('❌ Verify error:', fixedError)
    } else {
      console.log(`📧 Fixed replies with correct user: ${fixedReplies.length}`)
      fixedReplies.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.contact_email} - "${msg.subject}"`)
        console.log(`   Conversation: ${msg.conversation_id}`)
      })
    }
    
    // 4. Test inbox query
    console.log('\n4. Testing inbox query:')
    console.log('=' .repeat(50))
    
    const { data: inboxTest, error: inboxError } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('user_id', correctUserId)
      .eq('folder', 'inbox')
      .eq('channel', 'email')
    
    if (inboxError) {
      console.error('❌ Inbox test error:', inboxError)
    } else {
      const threadIds = [...new Set(inboxTest.map(m => m.conversation_id))]
      console.log(`📁 Inbox messages: ${inboxTest.length}`)
      console.log(`📁 Unique threads: ${threadIds.length}`)
      
      if (fixedReplies.length > 0) {
        const replyThreads = fixedReplies.map(r => r.conversation_id)
        const inInbox = replyThreads.filter(t => threadIds.includes(t))
        console.log(`📁 Reply threads in inbox: ${inInbox.length}/${replyThreads.length}`)
      }
    }
    
    console.log('\n🎉 REPLY MESSAGES FIXED!')
    console.log('📱 Refresh your inbox - the campaign replies should now appear!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixReplyMessagesDirectly()