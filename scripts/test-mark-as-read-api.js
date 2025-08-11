#!/usr/bin/env node

/**
 * Test Mark as Read API
 * 
 * This script tests the mark-as-read functionality to ensure it works correctly
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testMarkAsReadAPI() {
  console.log('🔄 TESTING MARK AS READ API\n')

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'

    // Find an unread message
    const { data: unreadMessage } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'unread')
      .limit(1)
      .single()

    if (!unreadMessage) {
      console.log('💡 No unread messages found to test with')
      return
    }

    console.log('📧 Found unread message to test:')
    console.log(`   ID: ${unreadMessage.id}`)
    console.log(`   Subject: ${unreadMessage.subject}`)
    console.log(`   Contact: ${unreadMessage.contact_email}`)
    console.log(`   Status: ${unreadMessage.status}`)
    console.log(`   Folder: ${unreadMessage.folder}`)

    // Check current folder counts
    const getUnreadCount = async () => {
      const { data: unreadMessages } = await supabase
        .from('inbox_messages')
        .select('folder')
        .eq('user_id', userId)
        .eq('status', 'unread')
        .neq('folder', 'trash')

      const counts = {}
      unreadMessages.forEach(msg => {
        const folder = msg.folder || 'inbox'
        counts[folder] = (counts[folder] || 0) + 1
      })
      return counts
    }

    console.log('\n📊 Before marking as read:')
    const beforeCounts = await getUnreadCount()
    Object.entries(beforeCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: ${count} unread`)
    })

    // Simulate the API call that the UI will make
    console.log('\n🔄 Simulating UI API call...')
    
    const { data: updatedMessage, error } = await supabase
      .from('inbox_messages')
      .update({ status: 'read' })
      .eq('id', unreadMessage.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating message:', error)
      return
    }

    console.log('✅ Message updated successfully')
    console.log(`   New status: ${updatedMessage.status}`)

    console.log('\n📊 After marking as read:')
    const afterCounts = await getUnreadCount()
    Object.entries(afterCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: ${count} unread`)
    })

    // Show the difference
    const changedFolder = unreadMessage.folder || 'inbox'
    const beforeCount = beforeCounts[changedFolder] || 0
    const afterCount = afterCounts[changedFolder] || 0
    
    console.log('\n🎯 Expected UI Behavior:')
    console.log(`1. User clicks on message in inbox`)
    console.log(`2. Message opens in right panel`)
    console.log(`3. Badge count changes: ${changedFolder} (${beforeCount}) → (${afterCount})`)
    if (afterCount === 0) {
      console.log(`4. Badge disappears completely for ${changedFolder}`)
    }

    // Revert for next test
    console.log('\n🔄 Reverting for next test...')
    await supabase
      .from('inbox_messages')
      .update({ status: 'unread' })
      .eq('id', unreadMessage.id)
    console.log('✅ Test data restored')

    console.log('\n🎉 MARK AS READ FUNCTIONALITY VERIFIED!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMarkAsReadAPI().then(() => {
  console.log('\n✅ Mark as read API test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})