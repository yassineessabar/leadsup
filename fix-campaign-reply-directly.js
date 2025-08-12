#!/usr/bin/env node

/**
 * Fix the campaign reply directly by updating its user ID
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixCampaignReplyDirectly() {
  try {
    console.log('🔧 Fixing campaign reply directly\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    const conversationId = 'YW50aG95MjMyN0BnbWFpbC5jb218dGVz'
    
    // 1. First, create/update the thread for the correct user
    console.log('1. Creating thread for correct user:')
    console.log('=' .repeat(50))
    
    const { data: threadData, error: threadError } = await supabase
      .from('inbox_threads')
      .upsert({
        user_id: correctUserId,
        conversation_id: conversationId,
        contact_email: 'anthoy2327@gmail.com',
        contact_name: 'anthoy2327@gmail.com',
        subject: 'Re: Una pregunta rápida sobre {{companyName}}',
        last_message_at: new Date().toISOString(),
        last_message_preview: 'Campaign reply captured',
        message_count: 1,
        unread_count: 1,
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })
      .select()
    
    if (threadError) {
      console.error('❌ Thread creation error:', threadError)
      return
    }
    
    console.log('✅ Thread created/updated for correct user')
    
    // 2. Now update the message to use correct user ID
    console.log('\n2. Updating message user_id:')
    console.log('=' .repeat(50))
    
    const { data: updatedMessage, error: updateError } = await supabase
      .from('inbox_messages')
      .update({ user_id: correctUserId })
      .eq('contact_email', 'anthoy2327@gmail.com')
      .eq('conversation_id', conversationId)
      .select()
    
    if (updateError) {
      console.error('❌ Message update error:', updateError)
      return
    }
    
    console.log(`✅ Updated ${updatedMessage.length} messages`)
    
    // 3. Clean up old thread if it exists
    console.log('\n3. Cleaning up old thread:')
    console.log('=' .repeat(50))
    
    const { error: deleteError } = await supabase
      .from('inbox_threads')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', wrongUserId)
    
    if (deleteError) {
      console.log(`⚠️ Old thread cleanup: ${deleteError.message}`)
    } else {
      console.log('✅ Old thread cleaned up')
    }
    
    // 4. Verify the fix
    console.log('\n4. Verifying fix:')
    console.log('=' .repeat(50))
    
    // Check message
    const { data: verifyMessage, error: verifyMsgError } = await supabase
      .from('inbox_messages')
      .select('user_id, contact_email, conversation_id')
      .eq('contact_email', 'anthoy2327@gmail.com')
      .eq('conversation_id', conversationId)
      .single()
    
    if (verifyMsgError) {
      console.error('❌ Message verification error:', verifyMsgError)
    } else {
      console.log(`✅ Message user_id: ${verifyMessage.user_id}`)
      console.log(`✅ Correct user: ${verifyMessage.user_id === correctUserId ? 'YES' : 'NO'}`)
    }
    
    // Check thread
    const { data: verifyThread, error: verifyThreadError } = await supabase
      .from('inbox_threads')
      .select('user_id, contact_email, conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', correctUserId)
      .single()
    
    if (verifyThreadError) {
      console.error('❌ Thread verification error:', verifyThreadError)
    } else {
      console.log(`✅ Thread user_id: ${verifyThread.user_id}`)
      console.log(`✅ Correct user: ${verifyThread.user_id === correctUserId ? 'YES' : 'NO'}`)
    }
    
    // Test inbox query
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
      console.log(`✅ Thread in inbox query: ${threadIds.includes(conversationId) ? 'YES' : 'NO'}`)
    }
    
    console.log('\n🎉 CAMPAIGN REPLY FIX COMPLETE!')
    console.log('📱 Refresh your inbox tab - the reply should now appear!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixCampaignReplyDirectly()