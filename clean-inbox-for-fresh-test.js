#!/usr/bin/env node

/**
 * Clean all inbox threads and messages for fresh end-to-end test
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function cleanInboxForFreshTest() {
  try {
    console.log('🧹 Cleaning inbox for fresh end-to-end test\n')
    
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Count current data
    console.log('1. Current inbox data:')
    console.log('=' .repeat(50))
    
    const { data: currentMessages, error: msgCountError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject')
      .eq('user_id', userId)
    
    if (msgCountError) {
      console.error('❌ Error counting messages:', msgCountError)
      return
    }
    
    const { data: currentThreads, error: threadCountError } = await supabase
      .from('inbox_threads')
      .select('id, contact_email, subject')
      .eq('user_id', userId)
    
    if (threadCountError) {
      console.error('❌ Error counting threads:', threadCountError)
      return
    }
    
    console.log(`📧 Current messages: ${currentMessages.length}`)
    currentMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.contact_email} - "${msg.subject}"`)
    })
    
    console.log(`\n🧵 Current threads: ${currentThreads.length}`)
    currentThreads.forEach((thread, i) => {
      console.log(`${i + 1}. ${thread.contact_email} - "${thread.subject}"`)
    })
    
    if (currentMessages.length === 0 && currentThreads.length === 0) {
      console.log('✅ Inbox already clean!')
      return
    }
    
    // 2. Delete all messages first (due to foreign key constraints)
    console.log('\n2. Deleting all inbox messages:')
    console.log('=' .repeat(50))
    
    const { data: deletedMessages, error: deleteMessagesError } = await supabase
      .from('inbox_messages')
      .delete()
      .eq('user_id', userId)
      .select('id')
    
    if (deleteMessagesError) {
      console.error('❌ Error deleting messages:', deleteMessagesError)
      return
    }
    
    console.log(`✅ Deleted ${deletedMessages.length} messages`)
    
    // 3. Delete all threads
    console.log('\n3. Deleting all inbox threads:')
    console.log('=' .repeat(50))
    
    const { data: deletedThreads, error: deleteThreadsError } = await supabase
      .from('inbox_threads')
      .delete()
      .eq('user_id', userId)
      .select('id')
    
    if (deleteThreadsError) {
      console.error('❌ Error deleting threads:', deleteThreadsError)
      return
    }
    
    console.log(`✅ Deleted ${deletedThreads.length} threads`)
    
    // 4. Verify cleanup
    console.log('\n4. Verifying cleanup:')
    console.log('=' .repeat(50))
    
    const { data: remainingMessages, error: verifyMsgError } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('user_id', userId)
    
    if (verifyMsgError) {
      console.error('❌ Error verifying messages:', verifyMsgError)
      return
    }
    
    const { data: remainingThreads, error: verifyThreadError } = await supabase
      .from('inbox_threads')
      .select('id')
      .eq('user_id', userId)
    
    if (verifyThreadError) {
      console.error('❌ Error verifying threads:', verifyThreadError)
      return
    }
    
    console.log(`✅ Remaining messages: ${remainingMessages.length}`)
    console.log(`✅ Remaining threads: ${remainingThreads.length}`)
    
    if (remainingMessages.length === 0 && remainingThreads.length === 0) {
      console.log('\n🎉 INBOX CLEANED SUCCESSFULLY!')
      console.log('📱 Your inbox is now empty and ready for fresh testing')
      console.log('')
      console.log('🚀 Next steps:')
      console.log('   1. Send campaign sequence to your clients')
      console.log('   2. Reply to the campaign email')
      console.log('   3. Check if reply appears in cleaned inbox')
    } else {
      console.log('\n⚠️ Some data still remains - may need manual cleanup')
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

cleanInboxForFreshTest()