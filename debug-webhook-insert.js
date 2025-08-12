#!/usr/bin/env node

/**
 * Debug the exact issue with the webhook database insert
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Generate conversation ID like the webhook does
function generateConversationId(contactEmail, senderEmail, campaignId) {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

async function debugInsert() {
  try {
    console.log('🔍 Debug: Testing webhook database insert...\n')
    
    // Get campaign sender data
    console.log('1. Finding campaign sender...')
    const { data: campaignSenders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('id, user_id, campaign_id')
      .eq('email', 'test@reply.leadsup.io')
      .limit(1)
    
    if (senderError || !campaignSenders || campaignSenders.length === 0) {
      console.error('❌ No campaign sender found for test@reply.leadsup.io')
      return
    }
    
    const campaignSender = campaignSenders[0]
    console.log('✅ Found campaign sender:', {
      id: campaignSender.id,
      user_id: campaignSender.user_id,
      campaign_id: campaignSender.campaign_id
    })
    
    // Generate conversation ID
    console.log('\n2. Generating conversation ID...')
    const fromEmail = 'essabar.yassine@gmail.com'
    const toEmail = 'test@reply.leadsup.io'
    const conversationId = generateConversationId(fromEmail, toEmail, campaignSender.campaign_id.toString())
    
    console.log('✅ Generated conversation_id:', conversationId)
    console.log('   Length:', conversationId.length)
    console.log('   Type:', typeof conversationId)
    
    // Test individual fields
    console.log('\n3. Testing field values...')
    console.log('   user_id:', campaignSender.user_id, typeof campaignSender.user_id)
    console.log('   campaign_id:', campaignSender.campaign_id, typeof campaignSender.campaign_id)
    console.log('   sender_id:', campaignSender.id, typeof campaignSender.id)
    
    // First create the thread
    console.log('\n4. Creating thread first...')
    const { data: thread, error: threadError } = await supabase
      .from('inbox_threads')
      .upsert({
        user_id: campaignSender.user_id,
        conversation_id: conversationId,
        campaign_id: campaignSender.campaign_id,
        contact_id: null,
        contact_email: fromEmail,
        subject: 'Debug Test',
        last_message_at: new Date().toISOString(),
        last_message_preview: 'This is a debug test',
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })
    
    if (threadError) {
      console.error('❌ Thread creation failed:', threadError)
      return
    }
    console.log('✅ Thread created/updated')
    
    // Try the insert
    console.log('\n5. Attempting database insert...')
    const messageId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const insertData = {
      user_id: campaignSender.user_id,
      message_id: messageId,
      conversation_id: conversationId,
      campaign_id: campaignSender.campaign_id,
      contact_id: null,
      contact_email: fromEmail,
      sender_id: campaignSender.id,
      sender_email: toEmail,
      subject: 'Debug Test',
      body_text: 'This is a debug test',
      body_html: '<p>This is a debug test</p>',
      direction: 'inbound',
      channel: 'email',
      status: 'unread',
      folder: 'inbox',
      has_attachments: false,
      provider: 'smtp',
      provider_data: {
        debug: true
      },
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString()
    }
    
    console.log('Insert data:', JSON.stringify(insertData, null, 2))
    
    const { data: message, error: insertError } = await supabase
      .from('inbox_messages')
      .insert(insertData)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError)
      console.error('Error details:', JSON.stringify(insertError, null, 2))
    } else {
      console.log('✅ Insert successful:', message.id)
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error)
  }
}

debugInsert()