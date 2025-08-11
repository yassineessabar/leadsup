#!/usr/bin/env node

/**
 * Create Test Unread Email
 * 
 * This script creates a test unread email directly in the database
 * to verify badge counting and mark-as-read functionality.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function createTestUnreadEmail() {
  console.log('📧 CREATING TEST UNREAD EMAIL');
  console.log('=============================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const testContactEmail = 'test-customer@example.com'
    const testSenderEmail = 'sender@yourdomain.com'
    
    // Generate unique IDs for this test
    const timestamp = Date.now()
    const messageId = `test-${timestamp}@example.com`
    const conversationId = Buffer.from(`${testContactEmail}|${testSenderEmail}|test-${timestamp}`).toString('base64').substring(0, 32)
    
    console.log('📨 Creating test email with:')
    console.log(`   User: ${userId}`)
    console.log(`   From: ${testContactEmail}`)
    console.log(`   To: ${testSenderEmail}`)
    console.log(`   Message ID: ${messageId}`)
    console.log(`   Conversation ID: ${conversationId}`)
    
    // Check current badge counts
    console.log('\n📊 Current folder badge counts:')
    const { data: currentStats } = await supabase
      .from('inbox_messages')
      .select('folder')
      .eq('user_id', userId)
      .eq('status', 'unread')
      .neq('folder', 'trash')
    
    const currentCounts = {}
    currentStats?.forEach(msg => {
      const folder = msg.folder || 'inbox'
      currentCounts[folder] = (currentCounts[folder] || 0) + 1
    })
    
    Object.entries(currentCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: (${count})`)
    })
    
    if (Object.keys(currentCounts).length === 0) {
      console.log('   No current unread messages')
    }
    
    // Create the thread first (required by foreign key constraint)
    console.log('\n🧵 Creating thread entry first...')
    
    const { data: insertedThread, error: threadError } = await supabase
      .from('inbox_threads')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        subject: `🧪 Test Email - Badge Update Verification ${new Date().toLocaleTimeString()}`,
        contact_email: testContactEmail,
        contact_name: 'Test Customer',
        message_count: 0,
        unread_count: 0,
        status: 'active',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (threadError) {
      console.error('❌ Error creating thread:', threadError)
      return
    }
    
    console.log('✅ Thread created successfully!')
    
    // Create the test message
    console.log('\n🔄 Inserting test unread email...')
    
    const testMessage = {
      user_id: userId,
      message_id: messageId,
      conversation_id: conversationId,
      thread_id: conversationId,
      subject: `🧪 Test Email - Badge Update Verification ${new Date().toLocaleTimeString()}`,
      body_text: `This is a test email to verify that:

1. ✅ New unread emails appear in the inbox
2. ✅ Badge counts update correctly to show unread messages 
3. ✅ Clicking the message marks it as read
4. ✅ Badge counts decrease after marking as read

Generated at: ${new Date().toISOString()}
Test ID: ${timestamp}`,
      body_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h3>🧪 Test Email - Badge Update Verification</h3>
        <p>This is a test email to verify that:</p>
        <ol>
          <li>✅ New unread emails appear in the inbox</li>
          <li>✅ Badge counts update correctly to show unread messages</li>
          <li>✅ Clicking the message marks it as read</li>
          <li>✅ Badge counts decrease after marking as read</li>
        </ol>
        <p><small>Generated at: ${new Date().toISOString()}<br>Test ID: ${timestamp}</small></p>
      </div>`,
      direction: 'inbound',
      channel: 'email',
      status: 'unread',
      folder: 'inbox',
      lead_status: null,
      contact_name: 'Test Customer',
      contact_email: testContactEmail,
      sender_email: testSenderEmail,
      has_attachments: false,
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: insertedMessage, error: insertError } = await supabase
      .from('inbox_messages')
      .insert(testMessage)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error creating test message:', insertError)
      return
    }
    
    console.log('✅ Test email created successfully!')
    console.log(`   Database ID: ${insertedMessage.id}`)
    
    // Update thread entry with message count
    console.log('\n🧵 Updating thread with message count...')
    
    await supabase
      .from('inbox_threads')
      .update({
        message_count: 1,
        unread_count: 1,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
    
    console.log('✅ Updated thread with message count')
    
    // Check updated badge counts
    console.log('\n📊 Updated folder badge counts:')
    const { data: newStats } = await supabase
      .from('inbox_messages')
      .select('folder')
      .eq('user_id', userId)
      .eq('status', 'unread')
      .neq('folder', 'trash')
    
    const newCounts = {}
    newStats?.forEach(msg => {
      const folder = msg.folder || 'inbox'
      newCounts[folder] = (newCounts[folder] || 0) + 1
    })
    
    Object.entries(newCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: (${count})`)
    })
    
    // Show the difference
    const inboxBefore = currentCounts.inbox || 0
    const inboxAfter = newCounts.inbox || 0
    
    console.log('\n🎯 VERIFICATION STEPS:')
    console.log('1. ✅ Test email created in database')
    console.log(`2. 📈 Inbox badge count: (${inboxBefore}) → (${inboxAfter})`)
    console.log('3. 🔄 Refresh your inbox UI to see the new message')
    console.log('4. 👆 Click on the test message thread')
    console.log(`5. ✅ Badge should decrease from (${inboxAfter}) to (${inboxAfter - 1})`)
    console.log('6. 💬 Message should appear as read (not bold)')
    
    console.log('\n📧 Test Message Details:')
    console.log(`   Subject: "${testMessage.subject}"`)
    console.log(`   From: ${testContactEmail}`)
    console.log(`   Status: ${testMessage.status.toUpperCase()}`)
    console.log(`   Folder: ${testMessage.folder}`)
    
    console.log('\n🧹 To clean up this test message later, run:')
    console.log(`   DELETE FROM inbox_messages WHERE id = '${insertedMessage.id}';`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
createTestUnreadEmail().then(() => {
  console.log('\n✅ Test unread email creation complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
});