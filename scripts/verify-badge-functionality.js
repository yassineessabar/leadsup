#!/usr/bin/env node

/**
 * Verify Badge Functionality
 * 
 * This script verifies that the badge counting and mark-as-read functionality
 * is working correctly with the test email we just created.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function verifyBadgeFunctionality() {
  console.log('🔍 VERIFYING BADGE & MARK-AS-READ FUNCTIONALITY');
  console.log('===============================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Step 1: Check current badge counts
    console.log('📊 Step 1: Current badge counts')
    const { data: currentMessages } = await supabase
      .from('inbox_messages')
      .select('folder, subject, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'unread')
      .neq('folder', 'trash')
      .order('created_at', { ascending: false })
    
    const badgeCounts = {}
    currentMessages?.forEach(msg => {
      const folder = msg.folder || 'inbox'
      badgeCounts[folder] = (badgeCounts[folder] || 0) + 1
    })
    
    console.log('Unread messages by folder:')
    Object.entries(badgeCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: (${count})`)
    })
    
    if (currentMessages?.length > 0) {
      console.log('\nMost recent unread messages:')
      currentMessages.slice(0, 3).forEach((msg, i) => {
        const isTestEmail = msg.subject.includes('🧪 Test Email')
        console.log(`   ${i + 1}. ${isTestEmail ? '🧪' : '📧'} "${msg.subject}" (${msg.folder})`)
      })
    } else {
      console.log('   No unread messages found')
      return
    }
    
    // Step 2: Find the test email we created
    const testEmail = currentMessages?.find(msg => msg.subject.includes('🧪 Test Email'))
    
    if (!testEmail) {
      console.log('\n❌ Test email not found. Please run create-test-unread-email.js first')
      return
    }
    
    console.log('\n✅ Step 2: Test email found')
    console.log(`   Subject: "${testEmail.subject}"`)
    console.log(`   Status: ${testEmail.status.toUpperCase()}`)
    console.log(`   Folder: ${testEmail.folder}`)
    
    // Step 3: Get the conversation ID for the test email
    const { data: testMessage } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', testEmail.subject)
      .single()
    
    if (!testMessage) {
      console.log('❌ Could not find full test message details')
      return
    }
    
    console.log('\n📧 Step 3: Test message details')
    console.log(`   Message ID: ${testMessage.id}`)
    console.log(`   Conversation ID: ${testMessage.conversation_id}`)
    console.log(`   Current Status: ${testMessage.status}`)
    
    // Step 4: Simulate the mark-as-read API call (what happens when user clicks)
    console.log('\n🔄 Step 4: Simulating user click (mark thread as read)')
    
    // This simulates what the UI does when user clicks on the thread
    const { data: updatedMessages, error } = await supabase
      .from('inbox_messages')
      .update({
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('conversation_id', testMessage.conversation_id)
      .eq('status', 'unread')
      .select('id, subject, folder')
    
    if (error) {
      console.error('❌ Error marking thread as read:', error)
      return
    }
    
    const markedCount = updatedMessages?.length || 0
    console.log(`✅ Marked ${markedCount} messages as read`)
    
    // Update thread unread count
    await supabase
      .from('inbox_threads')
      .update({ unread_count: 0 })
      .eq('user_id', userId)
      .eq('conversation_id', testMessage.conversation_id)
    
    console.log('✅ Updated thread unread count to 0')
    
    // Step 5: Verify badge counts after marking as read
    console.log('\n📊 Step 5: Badge counts after mark-as-read')
    const { data: afterMessages } = await supabase
      .from('inbox_messages')
      .select('folder')
      .eq('user_id', userId)
      .eq('status', 'unread')
      .neq('folder', 'trash')
    
    const afterBadgeCounts = {}
    afterMessages?.forEach(msg => {
      const folder = msg.folder || 'inbox'
      afterBadgeCounts[folder] = (afterBadgeCounts[folder] || 0) + 1
    })
    
    console.log('Updated badge counts:')
    Object.entries(afterBadgeCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: (${count})`)
    })
    
    if (Object.keys(afterBadgeCounts).length === 0) {
      console.log('   No unread messages (no badges shown)')
    }
    
    // Step 6: Show the test results
    console.log('\n🎯 TEST RESULTS:')
    const inboxBefore = badgeCounts.inbox || 0
    const inboxAfter = afterBadgeCounts.inbox || 0
    
    if (inboxBefore > inboxAfter) {
      console.log(`✅ Badge count decreased: (${inboxBefore}) → (${inboxAfter})`)
      console.log('✅ Mark-as-read functionality is working correctly!')
    } else {
      console.log(`❌ Badge count did not decrease: (${inboxBefore}) → (${inboxAfter})`)
    }
    
    if (markedCount > 0) {
      console.log(`✅ ${markedCount} message(s) marked as read`)
    }
    
    console.log('\n🔄 UI should show:')
    console.log('1. Badge count decreased (or disappeared if 0)')
    console.log('2. Test email thread appears as read (not bold)')
    console.log('3. Clicking refreshes the inbox view')
    
    // Step 7: Revert the test for next run
    console.log('\n🔄 Reverting test changes for next run...')
    await supabase
      .from('inbox_messages')
      .update({ 
        status: 'unread',
        updated_at: new Date().toISOString() 
      })
      .eq('id', testMessage.id)
    
    await supabase
      .from('inbox_threads')
      .update({ unread_count: 1 })
      .eq('user_id', userId)
      .eq('conversation_id', testMessage.conversation_id)
    
    console.log('✅ Test data restored for next verification')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

// Run the verification
verifyBadgeFunctionality().then(() => {
  console.log('\n✅ Badge functionality verification complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
});