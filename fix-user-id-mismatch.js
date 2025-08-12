#!/usr/bin/env node

/**
 * Fix user ID mismatch - update captured messages to use correct user ID
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixUserIdMismatch() {
  try {
    console.log('🔧 Fixing user ID mismatch\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    // 1. Check messages with wrong user ID
    console.log('1. Checking messages with wrong user ID:')
    console.log('=' .repeat(50))
    const { data: wrongMessages, error: wrongError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject, created_at, user_id')
      .eq('user_id', wrongUserId)
      .order('created_at', { ascending: false })
    
    if (wrongError) {
      console.error('❌ Error:', wrongError)
      return
    }
    
    console.log(`📧 Found ${wrongMessages.length} messages with wrong user ID:`)
    wrongMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.contact_email} - "${msg.subject}" (${new Date(msg.created_at).toLocaleTimeString()})`)
    })
    
    if (wrongMessages.length === 0) {
      console.log('✅ No messages to fix!')
      return
    }
    
    // 2. Update messages user_id
    console.log('\n2. Updating messages user_id:')
    console.log('=' .repeat(50))
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
    
    // 3. Check threads with wrong user ID
    console.log('\n3. Checking threads with wrong user ID:')
    console.log('=' .repeat(50))
    const { data: wrongThreads, error: wrongThreadError } = await supabase
      .from('inbox_threads')
      .select('id, conversation_id, contact_email, subject, user_id')
      .eq('user_id', wrongUserId)
    
    if (wrongThreadError) {
      console.error('❌ Error:', wrongThreadError)
      return
    }
    
    console.log(`🧵 Found ${wrongThreads.length} threads with wrong user ID:`)
    wrongThreads.forEach((thread, i) => {
      console.log(`${i + 1}. ${thread.contact_email} - "${thread.subject}"`)
    })
    
    if (wrongThreads.length === 0) {
      console.log('✅ No threads to fix!')
    } else {
      // 4. Update threads user_id
      console.log('\n4. Updating threads user_id:')
      console.log('=' .repeat(50))
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
    }
    
    // 5. Verify fix
    console.log('\n5. Verifying fix:')
    console.log('=' .repeat(50))
    const { data: verifyMessages, error: verifyError } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('user_id', correctUserId)
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError)
      return
    }
    
    console.log(`✅ Total messages for correct user: ${verifyMessages.length}`)
    
    const { data: verifyThreads, error: verifyThreadError } = await supabase
      .from('inbox_threads')
      .select('id')
      .eq('user_id', correctUserId)
    
    if (verifyThreadError) {
      console.error('❌ Error verifying threads:', verifyThreadError)
      return
    }
    
    console.log(`✅ Total threads for correct user: ${verifyThreads.length}`)
    
    console.log('\n🎉 SUCCESS: User ID mismatch fixed!')
    console.log('📱 Now refresh your inbox tab - all captured replies should appear!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixUserIdMismatch()