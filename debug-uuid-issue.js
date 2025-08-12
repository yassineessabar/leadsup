#!/usr/bin/env node

/**
 * Debug the specific UUID issue in webhook
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test the exact conversation ID generation from webhook
function generateConversationId(contactEmail, senderEmail, campaignId) {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  const result = Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  
  console.log('Conversation ID generation:')
  console.log('  participants:', participants)
  console.log('  base:', base)
  console.log('  base64:', Buffer.from(base).toString('base64'))
  console.log('  cleaned:', Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, ''))
  console.log('  final (32 chars):', result)
  console.log('  final length:', result.length)
  console.log('  final type:', typeof result)
  
  return result
}

async function debugUUIDIssue() {
  try {
    console.log('🔍 Debug: UUID Issue Investigation\n')
    
    // Get a real campaign sender
    const { data: campaignSenders, error } = await supabase
      .from('campaign_senders')
      .select('id, user_id, campaign_id')
      .eq('email', 'test@reply.leadsup.io')
      .limit(1)
    
    if (error || !campaignSenders.length) {
      console.error('❌ No campaign sender found')
      return
    }
    
    const campaignSender = campaignSenders[0]
    console.log('✅ Found campaign sender:')
    console.log('  id:', campaignSender.id, typeof campaignSender.id)
    console.log('  user_id:', campaignSender.user_id, typeof campaignSender.user_id)
    console.log('  campaign_id:', campaignSender.campaign_id, typeof campaignSender.campaign_id)
    
    // Test conversation ID generation
    console.log('\n📝 Testing conversation ID generation:')
    const conversationId = generateConversationId(
      'essabar.yassine@gmail.com',
      'test@reply.leadsup.io',
      campaignSender.campaign_id.toString()
    )
    
    // Test thread creation specifically
    console.log('\n🧵 Testing thread creation:')
    const threadData = {
      user_id: campaignSender.user_id,
      conversation_id: conversationId,
      campaign_id: campaignSender.campaign_id,
      contact_id: null,
      contact_email: 'essabar.yassine@gmail.com',
      subject: 'Debug UUID Test',
      last_message_at: new Date().toISOString(),
      last_message_preview: 'Testing UUID issue',
      status: 'active'
    }
    
    console.log('Thread data to insert:')
    Object.entries(threadData).forEach(([key, value]) => {
      console.log(`  ${key}: ${value} (${typeof value})`)
    })
    
    const { data: thread, error: threadError } = await supabase
      .from('inbox_threads')
      .upsert(threadData, {
        onConflict: 'conversation_id,user_id'
      })
    
    if (threadError) {
      console.error('\n❌ Thread creation failed:', threadError)
      console.error('Thread error details:', JSON.stringify(threadError, null, 2))
      return
    } else {
      console.log('\n✅ Thread creation successful')
    }
    
    // Now test message insertion
    console.log('\n📨 Testing message insertion:')
    const messageId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const messageData = {
      user_id: campaignSender.user_id,
      message_id: messageId,
      conversation_id: conversationId,
      campaign_id: campaignSender.campaign_id,
      contact_id: null,
      contact_email: 'essabar.yassine@gmail.com',
      sender_id: campaignSender.id,
      sender_email: 'test@reply.leadsup.io',
      subject: 'Debug UUID Test',
      body_text: 'Testing UUID issue in message',
      body_html: '<p>Testing UUID issue in message</p>',
      direction: 'inbound',
      channel: 'email',
      status: 'unread',
      folder: 'inbox',
      has_attachments: false,
      provider: 'smtp',
      provider_data: { debug: true },
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString()
    }
    
    console.log('Message data to insert:')
    Object.entries(messageData).forEach(([key, value]) => {
      console.log(`  ${key}: ${value} (${typeof value})`)
    })
    
    const { data: message, error: messageError } = await supabase
      .from('inbox_messages')
      .insert(messageData)
      .select()
      .single()
    
    if (messageError) {
      console.error('\n❌ Message insertion failed:', messageError)
      console.error('Message error details:', JSON.stringify(messageError, null, 2))
    } else {
      console.log('\n✅ Message insertion successful:', message.id)
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error)
  }
}

debugUUIDIssue()