#!/usr/bin/env node

/**
 * Fix user ID mismatch safely - update threads first, then messages
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixUserIdMismatchSafe() {
  try {
    console.log('🔧 Fixing user ID mismatch safely\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    // 1. Update threads first (required for foreign key constraint)
    console.log('1. Updating threads user_id:')
    console.log('=' .repeat(50))
    const { data: wrongThreads, error: wrongThreadError } = await supabase
      .from('inbox_threads')
      .select('id, conversation_id, contact_email, subject')
      .eq('user_id', wrongUserId)
    
    if (wrongThreadError) {
      console.error('❌ Error fetching threads:', wrongThreadError)
      return
    }
    
    console.log(`🧵 Found ${wrongThreads.length} threads to update:`)
    wrongThreads.forEach((thread, i) => {
      console.log(`${i + 1}. ${thread.contact_email} - "${thread.subject}"`)
    })
    
    if (wrongThreads.length > 0) {
      const { data: updatedThreads, error: updateThreadError } = await supabase
        .from('inbox_threads')
        .update({ user_id: correctUserId })
        .eq('user_id', wrongUserId)
        .select('id')
      
      if (updateThreadError) {
        console.error('❌ Error updating threads:', updateThreadError)
        return
      }
      
      console.log(`✅ Updated ${updatedThreads.length} threads`)
    } else {
      console.log('✅ No threads to update')
    }
    
    // 2. Now update messages
    console.log('\n2. Updating messages user_id:')
    console.log('=' .repeat(50))
    const { data: wrongMessages, error: wrongError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject')
      .eq('user_id', wrongUserId)
    
    if (wrongError) {
      console.error('❌ Error fetching messages:', wrongError)
      return
    }
    
    console.log(`📧 Found ${wrongMessages.length} messages to update`)
    
    if (wrongMessages.length > 0) {
      const { data: updatedMessages, error: updateMsgError } = await supabase
        .from('inbox_messages')
        .update({ user_id: correctUserId })
        .eq('user_id', wrongUserId)
        .select('id')
      
      if (updateMsgError) {
        console.error('❌ Error updating messages:', updateMsgError)
        return
      }
      
      console.log(`✅ Updated ${updatedMessages.length} messages`)
    } else {
      console.log('✅ No messages to update')
    }
    
    // 3. Verify fix
    console.log('\n3. Verifying fix:')
    console.log('=' .repeat(50))
    
    // Check campaign reply specifically
    const { data: campaignReply, error: replyError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject, user_id')
      .eq('contact_email', 'anthoy2327@gmail.com')
      .eq('user_id', correctUserId)
      .single()
    
    if (replyError) {
      console.error('❌ Campaign reply not found:', replyError)
    } else {
      console.log(`✅ Campaign reply now has correct user ID: ${campaignReply.user_id}`)
    }
    
    // Check total counts
    const { data: allMessages, error: allError } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('user_id', correctUserId)
    
    if (allError) {
      console.error('❌ Error counting messages:', allError)
    } else {
      console.log(`✅ Total messages for correct user: ${allMessages.length}`)
    }
    
    console.log('\n🎉 SUCCESS: User ID mismatch fixed!')
    console.log('📱 Now refresh your inbox tab - all captured replies should appear!')
    console.log('🔍 The anthoy2327@gmail.com reply should be visible!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixUserIdMismatchSafe()