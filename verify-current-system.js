#!/usr/bin/env node

/**
 * Verify the current system is working correctly
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyCurrentSystem() {
  try {
    console.log('✅ Verifying current system state\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Check webhook configuration
    console.log('1. Webhook configuration:')
    console.log('=' .repeat(50))
    
    const { data: webhookSenders, error: webhookError } = await supabase
      .from('campaign_senders')
      .select('user_id, campaign_id, email, name')
      .eq('email', 'test@reply.leadsup.io')
      .eq('user_id', correctUserId)
    
    if (webhookError) {
      console.error('❌ Webhook error:', webhookError)
    } else {
      console.log(`🔗 Webhook senders for correct user: ${webhookSenders.length}`)
      webhookSenders.forEach((sender, i) => {
        console.log(`${i + 1}. Campaign: ${sender.campaign_id}`)
        console.log(`   User: ${sender.user_id} ✅`)
        console.log(`   Email: ${sender.email}`)
      })
    }
    
    // 2. Check current inbox state
    console.log('\n2. Current inbox state:')
    console.log('=' .repeat(50))
    
    const { data: inboxMessages, error: inboxError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject, direction, user_id, created_at')
      .eq('user_id', correctUserId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (inboxError) {
      console.error('❌ Inbox error:', inboxError)
    } else {
      console.log(`📧 Messages for correct user: ${inboxMessages.length}`)
      inboxMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.direction} - ${msg.contact_email}`)
        console.log(`   Subject: ${msg.subject}`)
        console.log(`   Time: ${new Date(msg.created_at).toLocaleTimeString()}`)
      })
    }
    
    const { data: inboxThreads, error: threadError } = await supabase
      .from('inbox_threads')
      .select('id, contact_email, subject, user_id, created_at')
      .eq('user_id', correctUserId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (threadError) {
      console.error('❌ Thread error:', threadError)
    } else {
      console.log(`\n🧵 Threads for correct user: ${inboxThreads.length}`)
      inboxThreads.forEach((thread, i) => {
        console.log(`${i + 1}. ${thread.contact_email} - "${thread.subject}"`)
        console.log(`   Time: ${new Date(thread.created_at).toLocaleTimeString()}`)
      })
    }
    
    // 3. Test inbox API simulation
    console.log('\n3. Inbox API simulation:')
    console.log('=' .repeat(50))
    
    const { data: apiTest, error: apiError } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('user_id', correctUserId)
      .eq('folder', 'inbox')
      .eq('channel', 'email')
    
    if (apiError) {
      console.error('❌ API test error:', apiError)
    } else {
      const threadIds = [...new Set(apiTest.map(m => m.conversation_id))]
      console.log(`📁 Inbox folder messages: ${apiTest.length}`)
      console.log(`📁 Unique conversation threads: ${threadIds.length}`)
      
      if (threadIds.length > 0) {
        const { data: apiThreads, error: threadApiError } = await supabase
          .from('inbox_threads')
          .select('contact_email, subject')
          .eq('user_id', correctUserId)
          .in('conversation_id', threadIds)
          .order('last_message_at', { ascending: false })
          .limit(5)
        
        if (threadApiError) {
          console.error('❌ Thread API error:', threadApiError)
        } else {
          console.log(`📋 Threads that would appear in inbox:`)
          apiThreads.forEach((thread, i) => {
            console.log(`${i + 1}. ${thread.contact_email} - "${thread.subject}"`)
          })
        }
      }
    }
    
    // 4. System readiness
    console.log('\n4. System readiness:')
    console.log('=' .repeat(50))
    
    const isWebhookReady = webhookSenders && webhookSenders.length > 0
    const hasInboxData = inboxMessages && inboxMessages.length > 0
    
    console.log(`🔗 Webhook configured: ${isWebhookReady ? '✅' : '❌'}`)
    console.log(`📧 Inbox has data: ${hasInboxData ? '✅' : '❌'}`)
    console.log(`📱 Frontend user ID: ${correctUserId}`)
    
    if (isWebhookReady) {
      console.log('\n🎉 SYSTEM IS READY!')
      console.log('📧 New replies will be captured with correct user ID')
      console.log('📱 Replies will appear in your inbox')
      
      if (!hasInboxData) {
        console.log('\n📭 Inbox is currently empty')
        console.log('🔄 Send a new campaign and reply to test the system')
      }
    } else {
      console.log('\n❌ SYSTEM NOT READY - webhook configuration missing')
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

verifyCurrentSystem()