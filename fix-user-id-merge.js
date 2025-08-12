#!/usr/bin/env node

/**
 * Fix user ID mismatch by merging duplicate threads and updating messages
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixUserIdMerge() {
  try {
    console.log('🔧 Fixing user ID mismatch by merging threads\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const wrongUserId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    // 1. Check for duplicate threads
    console.log('1. Checking for duplicate threads:')
    console.log('=' .repeat(50))
    
    const { data: wrongThreads, error: wrongError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', wrongUserId)
    
    if (wrongError) {
      console.error('❌ Error:', wrongError)
      return
    }
    
    const { data: correctThreads, error: correctError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', correctUserId)
    
    if (correctError) {
      console.error('❌ Error:', correctError)
      return
    }
    
    console.log(`🧵 Wrong user threads: ${wrongThreads.length}`)
    console.log(`🧵 Correct user threads: ${correctThreads.length}`)
    
    // 2. Handle each wrong thread
    for (const wrongThread of wrongThreads) {
      console.log(`\nProcessing: ${wrongThread.conversation_id} - ${wrongThread.contact_email}`)
      
      // Check if thread already exists for correct user
      const existingThread = correctThreads.find(t => t.conversation_id === wrongThread.conversation_id)
      
      if (existingThread) {
        console.log(`⚠️ Duplicate found - will delete wrong thread and update messages`)
        
        // Update messages to point to existing thread
        const { data: messages, error: msgError } = await supabase
          .from('inbox_messages')
          .update({ user_id: correctUserId })
          .eq('user_id', wrongUserId)
          .eq('conversation_id', wrongThread.conversation_id)
          .select('id')
        
        if (msgError) {
          console.error(`❌ Error updating messages: ${msgError.message}`)
          continue
        } else {
          console.log(`✅ Updated ${messages.length} messages`)
        }
        
        // Delete the duplicate wrong thread
        const { error: deleteError } = await supabase
          .from('inbox_threads')
          .delete()
          .eq('id', wrongThread.id)
        
        if (deleteError) {
          console.error(`❌ Error deleting duplicate thread: ${deleteError.message}`)
        } else {
          console.log(`✅ Deleted duplicate thread`)
        }
        
      } else {
        console.log(`✅ No duplicate - will update thread user_id`)
        
        // No duplicate, just update the user_id
        const { error: updateError } = await supabase
          .from('inbox_threads')
          .update({ user_id: correctUserId })
          .eq('id', wrongThread.id)
        
        if (updateError) {
          console.error(`❌ Error updating thread: ${updateError.message}`)
          continue
        } else {
          console.log(`✅ Updated thread user_id`)
        }
        
        // Update messages for this thread
        const { data: messages, error: msgError } = await supabase
          .from('inbox_messages')
          .update({ user_id: correctUserId })
          .eq('user_id', wrongUserId)
          .eq('conversation_id', wrongThread.conversation_id)
          .select('id')
        
        if (msgError) {
          console.error(`❌ Error updating messages: ${msgError.message}`)
        } else {
          console.log(`✅ Updated ${messages.length} messages`)
        }
      }
    }
    
    // 3. Verify fix
    console.log('\n3. Verifying fix:')
    console.log('=' .repeat(50))
    
    // Check campaign reply specifically
    const { data: campaignReply, error: replyError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject, user_id, conversation_id')
      .eq('contact_email', 'anthoy2327@gmail.com')
      .single()
    
    if (replyError) {
      console.error('❌ Campaign reply check failed:', replyError)
    } else {
      console.log(`✅ Campaign reply user_id: ${campaignReply.user_id}`)
      console.log(`✅ Campaign reply conversation: ${campaignReply.conversation_id}`)
      
      if (campaignReply.user_id === correctUserId) {
        console.log('🎉 SUCCESS: Campaign reply now has correct user ID!')
      } else {
        console.log('❌ Campaign reply still has wrong user ID')
      }
    }
    
    // Check if any wrong user data remains
    const { data: remainingWrong, error: remainingError } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('user_id', wrongUserId)
    
    if (remainingError) {
      console.error('❌ Error checking remaining:', remainingError)
    } else {
      console.log(`📊 Remaining messages with wrong user ID: ${remainingWrong.length}`)
    }
    
    console.log('\n🎉 MERGE COMPLETE!')
    console.log('📱 Now refresh your inbox tab - the campaign reply should appear!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixUserIdMerge()