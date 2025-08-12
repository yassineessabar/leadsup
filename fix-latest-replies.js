#!/usr/bin/env node

/**
 * Fix the latest replies to use correct user ID
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixLatestReplies() {
  try {
    console.log('🔧 Fixing latest replies to use correct user ID\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    // 1. Get the latest replies with wrong user ID
    console.log('1. Latest replies with wrong user ID:')
    console.log('=' .repeat(50))
    
    const { data: wrongReplies, error: replyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', wrongUserId)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })
    
    if (replyError) {
      console.error('❌ Error:', replyError)
      return
    }
    
    console.log(`📧 Found ${wrongReplies.length} replies to fix:`)
    wrongReplies.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.contact_email}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Conversation: ${msg.conversation_id}`)
    })
    
    if (wrongReplies.length === 0) {
      console.log('✅ No replies to fix!')
      return
    }
    
    // 2. For each reply, ensure correct thread exists and fix message
    for (const reply of wrongReplies) {
      console.log(`\n🔧 Fixing: ${reply.contact_email}`)
      
      // Create/update thread with correct user ID
      const { error: threadError } = await supabase
        .from('inbox_threads')
        .upsert({
          user_id: correctUserId,
          conversation_id: reply.conversation_id,
          contact_email: reply.contact_email,
          contact_name: reply.contact_name || reply.contact_email,
          subject: reply.subject,
          last_message_at: reply.received_at || reply.created_at,
          last_message_preview: reply.body_text?.substring(0, 150) || 'Reply captured',
          message_count: 1,
          unread_count: 1,
          status: 'active',
          campaign_id: reply.campaign_id
        }, {
          onConflict: 'conversation_id,user_id'
        })
      
      if (threadError) {
        console.error(`  ❌ Thread error:`, threadError)
        continue
      } else {
        console.log(`  ✅ Thread created/updated for correct user`)
      }
      
      // Update message to correct user ID
      const { error: updateError } = await supabase
        .from('inbox_messages')
        .update({ user_id: correctUserId })
        .eq('id', reply.id)
      
      if (updateError) {
        console.error(`  ❌ Message update error:`, updateError)
      } else {
        console.log(`  ✅ Message updated to correct user`)
      }
      
      // Delete old thread with wrong user ID
      const { error: deleteError } = await supabase
        .from('inbox_threads')
        .delete()
        .eq('conversation_id', reply.conversation_id)
        .eq('user_id', wrongUserId)
      
      if (deleteError) {
        console.log(`  ⚠️ Delete old thread: ${deleteError.message}`)
      } else {
        console.log(`  ✅ Old thread deleted`)
      }
    }
    
    // 3. Verify fix
    console.log('\n3. Verifying fix:')
    console.log('=' .repeat(50))
    
    const { data: fixedReplies, error: fixedError } = await supabase
      .from('inbox_messages')
      .select('contact_email, user_id, conversation_id')
      .eq('user_id', correctUserId)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    
    if (fixedError) {
      console.error('❌ Verify error:', fixedError)
    } else {
      console.log(`✅ Fixed replies with correct user: ${fixedReplies.length}`)
      fixedReplies.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.contact_email}`)
      })
    }
    
    // 4. Test inbox API
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
        console.log(`📁 Fixed replies in inbox: ${inInbox.length}/${replyThreads.length}`)
        
        if (inInbox.length === replyThreads.length) {
          console.log('\n🎉 SUCCESS: All replies now appear in inbox!')
          console.log('📱 Refresh your inbox tab - they should be there!')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixLatestReplies()