#!/usr/bin/env node

/**
 * Real Email Response Monitor
 * 
 * This script monitors for new real email responses and verifies webhook capture.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

let lastCheckTime = new Date()

async function monitorRealResponses() {
  console.log('🔍 REAL EMAIL RESPONSE MONITOR')
  console.log('=============================\n')
  
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  
  console.log(`⏰ Starting monitor at: ${lastCheckTime.toLocaleString()}`)
  console.log('👀 Watching for new emails... (Press Ctrl+C to stop)')
  console.log('')
  
  // Initial state
  const { data: initialMessages } = await supabase
    .from('inbox_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)
  
  console.log(`📊 Current inbox state (latest 3 messages):`)
  initialMessages?.forEach((msg, i) => {
    const direction = msg.direction === 'outbound' ? '📤' : '📥'
    const status = msg.status.toUpperCase()
    const time = new Date(msg.created_at).toLocaleTimeString()
    const provider = msg.provider ? `[${msg.provider.toUpperCase()}]` : ''
    console.log(`   ${i + 1}. ${direction} ${status} "${msg.subject}" (${time}) ${provider}`)
  })
  
  console.log('')
  console.log('🔄 Now monitoring for new messages...')
  console.log('   (New messages will appear below)')
  console.log('')
  
  // Monitor for new messages every 5 seconds
  setInterval(async () => {
    try {
      // Get messages since last check
      const { data: newMessages } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('user_id', userId)
        .gt('created_at', lastCheckTime.toISOString())
        .order('created_at', { ascending: false })
      
      if (newMessages && newMessages.length > 0) {
        console.log(`🆕 NEW MESSAGES DETECTED (${newMessages.length}):`)
        console.log('=====================================')
        
        newMessages.reverse().forEach((msg, i) => {
          const direction = msg.direction === 'outbound' ? '📤 OUTBOUND' : '📥 INBOUND'
          const status = msg.status.toUpperCase()
          const time = new Date(msg.created_at).toLocaleString()
          const provider = msg.provider ? `[${msg.provider.toUpperCase()}]` : ''
          
          console.log(`\\n🎯 Message ${i + 1}:`)
          console.log(`   Direction: ${direction}`)
          console.log(`   Status: ${status}`)
          console.log(`   Subject: "${msg.subject}"`)
          console.log(`   From: ${msg.contact_email}`)
          console.log(`   To: ${msg.sender_email}`)
          console.log(`   Provider: ${provider || 'MANUAL'}`)
          console.log(`   Created: ${time}`)
          console.log(`   Conversation: ${msg.conversation_id}`)
          
          if (msg.body_text) {
            const preview = msg.body_text.substring(0, 100).replace(/\\n/g, ' ')
            console.log(`   Preview: "${preview}${msg.body_text.length > 100 ? '...' : ''}"`)
          }
          
          // If this is inbound and from webhook, it means capture is working!
          if (msg.direction === 'inbound' && msg.provider === 'smtp') {
            console.log(`   ✅ SUCCESS: Real email captured via SMTP webhook!`)
          } else if (msg.direction === 'inbound' && msg.provider === 'gmail') {
            console.log(`   ✅ SUCCESS: Real email captured via Gmail webhook!`)
          } else if (msg.direction === 'inbound') {
            console.log(`   ℹ️  NOTE: Email was created manually (not via webhook)`)
          }
        })
        
        // Check badge counts
        console.log('\\n📊 Updated Badge Counts:')
        console.log('========================')
        
        const folders = ['inbox', 'sent', 'drafts']
        for (const folder of folders) {
          const { count } = await supabase
            .from('inbox_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('folder', folder)
            .eq('status', 'unread')
          
          const emoji = folder === 'inbox' ? '📥' : folder === 'sent' ? '📤' : '📝'
          console.log(`   ${emoji} ${folder.toUpperCase()}: ${count || 0} unread`)
        }
        
        console.log('\\n🔄 Continuing to monitor...')
        console.log('')
      }
      
      // Update last check time
      lastCheckTime = new Date()
      
    } catch (error) {
      console.error('❌ Monitor error:', error.message)
    }
  }, 5000) // Check every 5 seconds
  
  // Also show instructions
  console.log('💡 TESTING INSTRUCTIONS:')
  console.log('========================')
  console.log('')
  console.log('To test webhook capture:')
  console.log('')
  console.log('📧 METHOD 1: Gmail Forward (Easiest)')
  console.log('1. Go to Gmail Settings > Forwarding and POP/IMAP')
  console.log('2. Forward emails to a script that calls your webhook')
  console.log('3. Or use Gmail filters to forward specific emails')
  console.log('')
  console.log('📧 METHOD 2: SMTP Webhook Test')
  console.log('1. Use curl to simulate incoming email:')
  console.log('')
  console.log('curl -X POST http://localhost:3000/api/webhooks/smtp \\\\')
  console.log('  -H "Content-Type: application/json" \\\\')
  console.log('  -H "Authorization: Bearer test-webhook-secret" \\\\')
  console.log('  -d \'{"')
  console.log('    "from": "external@example.com",')
  console.log('    "to": "essabar.yassine@gmail.com",')
  console.log('    "subject": "Real webhook test",')
  console.log('    "textBody": "This is a real webhook test email",')
  console.log('    "messageId": "real-test-' + Date.now() + '@example.com",')
  console.log('    "date": "' + new Date().toISOString() + '"')
  console.log('  }\\'')
  console.log('')
  console.log('📧 METHOD 3: SendGrid/Mailgun')
  console.log('1. Configure SendGrid Inbound Parse or Mailgun Routes')
  console.log('2. Send real email to your configured domain')
  console.log('3. Provider will forward to your webhook automatically')
  console.log('')
  console.log('🎯 Expected Result: New message appears above with provider info')
  console.log('')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n👋 Stopping monitor...')
  console.log('✅ Real email response monitoring complete')
  process.exit(0)
})

// Run the monitor
monitorRealResponses().catch((error) => {
  console.error('❌ Monitor failed:', error)
  process.exit(1)
})