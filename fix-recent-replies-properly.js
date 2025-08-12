#!/usr/bin/env node

/**
 * Fix recent replies by properly handling threads first
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixRecentRepliesProperly() {
  try {
    console.log('🔧 Fixing recent replies properly\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    // 1. Get recent messages with wrong user ID
    console.log('1. Getting recent messages with wrong user ID:')
    console.log('=' .repeat(50))
    
    const { data: wrongMessages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', wrongUserId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
    
    if (msgError) {
      console.error('❌ Error:', msgError)
      return
    }
    
    console.log(`📧 Found ${wrongMessages.length} recent messages with wrong user ID:`)
    wrongMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.contact_email} - ${msg.conversation_id}`)
    })
    
    if (wrongMessages.length === 0) {
      console.log('✅ No recent messages to fix!')
      return
    }
    
    // 2. Group by conversation ID
    const conversations = [...new Set(wrongMessages.map(m => m.conversation_id))]
    console.log(`\n📊 Conversations to fix: ${conversations.length}`)
    
    // 3. Fix each conversation
    for (const conversationId of conversations) {
      console.log(`\nFixing conversation: ${conversationId}`)
      
      const convMessages = wrongMessages.filter(m => m.conversation_id === conversationId)
      console.log(`  Messages: ${convMessages.length}`)
      
      // Get any existing thread for correct user with this conversation
      const { data: existingThread, error: existingError } = await supabase
        .from('inbox_threads')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', correctUserId)
        .single()
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error(`  ❌ Error checking existing thread:`, existingError)
        continue
      }
      
      if (existingThread) {
        console.log(`  ✅ Thread already exists for correct user`)
        
        // Delete wrong user thread if it exists
        const { error: deleteError } = await supabase
          .from('inbox_threads')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', wrongUserId)
        
        if (deleteError) {
          console.log(`  ⚠️ Delete old thread: ${deleteError.message}`)
        }
        
      } else {
        console.log(`  🔧 Creating thread for correct user`)
        
        // Get sample message for thread data
        const sampleMessage = convMessages[0]
        
        // Create thread for correct user
        const { error: createError } = await supabase
          .from('inbox_threads')
          .insert({
            user_id: correctUserId,
            conversation_id: conversationId,
            contact_email: sampleMessage.contact_email,
            contact_name: sampleMessage.contact_name || sampleMessage.contact_email,
            subject: sampleMessage.subject,
            last_message_at: new Date().toISOString(),
            last_message_preview: sampleMessage.body_text?.substring(0, 150) || 'Reply captured',
            message_count: convMessages.length,
            unread_count: convMessages.length,
            status: 'active',
            campaign_id: sampleMessage.campaign_id
          })
        
        if (createError) {
          console.error(`  ❌ Create thread error:`, createError)
          continue
        } else {
          console.log(`  ✅ Thread created for correct user`)
        }
        
        // Delete wrong user thread
        const { error: deleteError } = await supabase
          .from('inbox_threads')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', wrongUserId)
        
        if (deleteError) {
          console.log(`  ⚠️ Delete old thread: ${deleteError.message}`)
        }
      }
      
      // Now update messages to correct user
      const { data: updatedMessages, error: updateError } = await supabase
        .from('inbox_messages')
        .update({ user_id: correctUserId })
        .eq('conversation_id', conversationId)
        .eq('user_id', wrongUserId)
        .select('id')
      
      if (updateError) {
        console.error(`  ❌ Update messages error:`, updateError)
      } else {
        console.log(`  ✅ Updated ${updatedMessages.length} messages`)
      }
    }
    
    // 4. Verify fix
    console.log('\n4. Verifying fix:')
    console.log('=' .repeat(50))
    
    const { data: remainingWrong, error: remainingError } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('user_id', wrongUserId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    if (remainingError) {
      console.error('❌ Verify error:', remainingError)
    } else {
      console.log(`📊 Remaining recent messages with wrong user: ${remainingWrong.length}`)
    }
    
    const { data: correctMessages, error: correctError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject')
      .eq('user_id', correctUserId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    if (correctError) {
      console.error('❌ Correct messages error:', correctError)
    } else {
      console.log(`📊 Recent messages with correct user: ${correctMessages.length}`)
      correctMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.contact_email} - "${msg.subject}"`)
      })
    }
    
    console.log('\n🎉 RECENT REPLIES FIXED!')
    console.log('📱 Refresh your inbox - the replies should now appear!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixRecentRepliesProperly()