#!/usr/bin/env node

/**
 * Debug Mailgun Webhook
 * 
 * Helps debug database insertion issues
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function debugMailgun() {
  console.log('🔧 MAILGUN DEBUG')
  console.log('================\n')
  
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  const campaignId = '648b0900-06b2-4d3f-80b8-1e8fad4ae4c6'
  const fromEmail = 'prospect@example.com'
  const toEmail = 'campaign@sandbox09593b053aaa4a158cfdada61cbbdb0d.mailgun.org'
  
  try {
    console.log('🔍 Step 1: Check campaign sender exists...')
    
    const { data: sender, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('email', toEmail)
      .single()
    
    if (sender) {
      console.log('✅ Campaign sender found:')
      console.log(`   Email: ${sender.email}`)
      console.log(`   User ID: ${sender.user_id}`)
      console.log(`   Campaign ID: ${sender.campaign_id}`)
    } else {
      console.log('❌ Campaign sender not found:', senderError?.message)
      return
    }
    
    console.log('\n🔍 Step 2: Check contact exists...')
    
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', fromEmail)
      .single()
    
    if (contact) {
      console.log('✅ Contact found:')
      console.log(`   Email: ${contact.email}`)
      console.log(`   ID: ${contact.id}`)
    } else {
      console.log('⚠️  Contact not found (will use null)')
    }
    
    console.log('\n🔍 Step 3: Test direct database insertion...')
    
    const testMessageData = {
      user_id: sender.user_id,
      message_id: `debug-test-${Date.now()}@example.com`,
      conversation_id: 'test-conversation-123',
      campaign_id: sender.campaign_id,
      contact_id: contact?.id || null,
      contact_email: fromEmail,
      sender_email: toEmail,
      subject: 'Debug Test Message',
      body_text: 'This is a debug test message',
      body_html: '<p>This is a <strong>debug test</strong> message</p>',
      direction: 'inbound',
      channel: 'email',
      status: 'unread',
      folder: 'inbox',
      has_attachments: false,
      attachments: [],
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      provider: 'mailgun',
      provider_data: {
        test: true,
        debug: 'mailgun-debug'
      }
    }
    
    console.log('📝 Attempting to insert message...')
    console.log('Data:', JSON.stringify(testMessageData, null, 2))
    
    const { data: insertedMessage, error: insertError } = await supabase
      .from('inbox_messages')
      .insert(testMessageData)
      .select()
      .single()
    
    if (insertError) {
      console.log('\n❌ DATABASE INSERT ERROR:')
      console.log('=========================')
      console.log('Code:', insertError.code)
      console.log('Message:', insertError.message)
      console.log('Details:', insertError.details)
      console.log('Hint:', insertError.hint)
      
      // Common fixes
      console.log('\n💡 Possible Solutions:')
      console.log('=====================')
      if (insertError.code === '23502') {
        console.log('• NULL value error - check required fields')
      } else if (insertError.code === '23503') {
        console.log('• Foreign key constraint - check user_id, campaign_id, contact_id')
      } else if (insertError.code === '22P02') {
        console.log('• Data type error - check UUID format')
      }
      
    } else {
      console.log('\n✅ MESSAGE INSERTED SUCCESSFULLY!')
      console.log('=================================')
      console.log(`Message ID: ${insertedMessage.id}`)
      console.log(`Subject: ${insertedMessage.subject}`)
      console.log(`Status: ${insertedMessage.status}`)
      console.log(`Provider: ${insertedMessage.provider}`)
      console.log(`Created: ${new Date(insertedMessage.created_at).toLocaleString()}`)
      
      console.log('\n🧵 Testing thread insertion...')
      
      const { data: thread, error: threadError } = await supabase
        .from('inbox_threads')
        .upsert({
          user_id: sender.user_id,
          conversation_id: 'test-conversation-123',
          campaign_id: sender.campaign_id,
          contact_id: contact?.id || null,
          contact_email: fromEmail,
          subject: 'Debug Test Message',
          last_message_at: new Date().toISOString(),
          last_message_preview: 'This is a debug test message',
          status: 'active'
        }, {
          onConflict: 'conversation_id,user_id'
        })
        .select()
        .single()
      
      if (threadError) {
        console.log('❌ Thread error:', threadError)
      } else {
        console.log('✅ Thread created/updated successfully')
        console.log(`Thread ID: ${thread.id}`)
      }
      
      console.log('\n🎉 DATABASE OPERATIONS WORKING!')
      console.log('The Mailgun webhook should work now.')
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run debug
debugMailgun().then(() => {
  console.log('\n✅ Mailgun debug complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Debug failed:', error)
  process.exit(1)
})