#!/usr/bin/env node

/**
 * Debug inbox threading issue - why captured replies aren't showing in inbox tab
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugInboxThreading() {
  try {
    console.log('🔍 Debugging inbox threading issue\n')
    
    // 1. Get the latest captured reply
    console.log('1. Latest captured reply:')
    console.log('=' .repeat(50))
    const { data: latestReply, error: replyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('contact_email', 'anthoy2327@gmail.com')
      .eq('subject', 'Re: Una pregunta rápida sobre {{companyName}}')
      .order('received_at', { ascending: false })
      .limit(1)
      .single()
    
    if (replyError) {
      console.error('❌ Error fetching latest reply:', replyError)
      return
    }
    
    console.log(`📧 Reply Details:`)
    console.log(`   ID: ${latestReply.id}`)
    console.log(`   From: ${latestReply.contact_email}`)
    console.log(`   To: ${latestReply.sender_email}`)
    console.log(`   Subject: ${latestReply.subject}`)
    console.log(`   Campaign: ${latestReply.campaign_id}`)
    console.log(`   Conversation: ${latestReply.conversation_id}`)
    console.log(`   Direction: ${latestReply.direction}`)
    console.log(`   Folder: ${latestReply.folder}`)
    console.log(`   User: ${latestReply.user_id}`)
    
    // 2. Check if there's a corresponding thread
    console.log('\n2. Corresponding thread:')
    console.log('=' .repeat(50))
    const { data: thread, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('conversation_id', latestReply.conversation_id)
      .eq('user_id', latestReply.user_id)
      .single()
    
    if (threadError) {
      console.error('❌ No thread found:', threadError.message)
      console.log('🔧 This might be why it\'s not showing in inbox!')
    } else {
      console.log(`✅ Thread found:`)
      console.log(`   ID: ${thread.id}`)
      console.log(`   Conversation: ${thread.conversation_id}`)
      console.log(`   Contact: ${thread.contact_email}`)
      console.log(`   Subject: ${thread.subject}`)
      console.log(`   Message Count: ${thread.message_count}`)
      console.log(`   Last Message: ${thread.last_message_at}`)
      console.log(`   Status: ${thread.status}`)
    }
    
    // 3. Check for original campaign email (outbound)
    console.log('\n3. Original campaign email:')
    console.log('=' .repeat(50))
    const { data: originalEmail, error: origError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('contact_email', 'anthoy2327@gmail.com')
      .eq('direction', 'outbound')
      .eq('campaign_id', latestReply.campaign_id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()
    
    if (origError) {
      console.error('❌ No original campaign email found:', origError.message)
      console.log('🔧 This could explain threading issues!')
    } else {
      console.log(`✅ Original email found:`)
      console.log(`   ID: ${originalEmail.id}`)
      console.log(`   Subject: ${originalEmail.subject}`)
      console.log(`   Conversation: ${originalEmail.conversation_id}`)
      console.log(`   Sent: ${originalEmail.sent_at}`)
    }
    
    // 4. Check inbox API query simulation
    console.log('\n4. Inbox API simulation:')
    console.log('=' .repeat(50))
    const userId = latestReply.user_id
    
    // Simulate what inbox tab queries
    const { data: inboxThreads, error: inboxError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(5)
    
    if (inboxError) {
      console.error('❌ Inbox query failed:', inboxError)
    } else {
      console.log(`📋 Inbox shows ${inboxThreads.length} threads:`)
      inboxThreads.forEach((t, i) => {
        console.log(`${i + 1}. ${t.conversation_id} - ${t.contact_email} - "${t.subject}"`)
        console.log(`   Messages: ${t.message_count}, Last: ${new Date(t.last_message_at).toLocaleTimeString()}`)
      })
      
      // Check if our conversation is in the list
      const ourThread = inboxThreads.find(t => t.conversation_id === latestReply.conversation_id)
      if (ourThread) {
        console.log(`\n✅ Our thread IS in inbox results!`)
      } else {
        console.log(`\n❌ Our thread is NOT in inbox results - this is the problem!`)
      }
    }
    
    // 5. Diagnosis and solution
    console.log('\n5. Diagnosis:')
    console.log('=' .repeat(50))
    if (threadError) {
      console.log('❌ ISSUE: No thread created for the reply')
      console.log('🔧 SOLUTION: Webhook needs to create/update thread when processing reply')
    } else if (!thread || thread.status !== 'active') {
      console.log('❌ ISSUE: Thread exists but is not active')
      console.log('🔧 SOLUTION: Update thread status to active')
    } else {
      console.log('✅ Thread exists and should be visible')
      console.log('🔍 Need to check inbox tab filtering or refresh')
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugInboxThreading()