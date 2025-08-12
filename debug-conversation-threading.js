#!/usr/bin/env node

/**
 * Debug conversation threading issue
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugConversationThreading() {
  try {
    console.log('🧵 Debugging conversation threading\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Get all recent messages and their conversation IDs
    console.log('1. Recent messages and conversation IDs:')
    console.log('=' .repeat(60))
    
    const { data: recentMessages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('contact_email, conversation_id, subject, body_text, created_at, direction')
      .eq('user_id', correctUserId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
    
    if (msgError) {
      console.error('❌ Error:', msgError)
      return
    }
    
    console.log(`📧 Found ${recentMessages.length} recent messages:`)
    recentMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.contact_email} (${msg.direction})`)
      console.log(`   Conversation: ${msg.conversation_id}`)
      console.log(`   Content: "${msg.body_text?.substring(0, 30)}..."`)
      console.log(`   Time: ${new Date(msg.created_at).toLocaleTimeString()}`)
      console.log('')
    })
    
    // 2. Group by conversation ID to see what's mixed up
    console.log('2. Messages grouped by conversation ID:')
    console.log('=' .repeat(60))
    
    const conversationGroups = {}
    recentMessages.forEach(msg => {
      if (!conversationGroups[msg.conversation_id]) {
        conversationGroups[msg.conversation_id] = []
      }
      conversationGroups[msg.conversation_id].push(msg)
    })
    
    Object.entries(conversationGroups).forEach(([convId, messages]) => {
      console.log(`🧵 Conversation: ${convId}`)
      console.log(`   Messages: ${messages.length}`)
      
      // Check if all messages are from same contact
      const uniqueContacts = [...new Set(messages.map(m => m.contact_email))]
      console.log(`   Contacts: ${uniqueContacts.join(', ')}`)
      
      if (uniqueContacts.length > 1) {
        console.log(`   ❌ PROBLEM: Multiple contacts in one conversation!`)
      } else {
        console.log(`   ✅ Single contact conversation`)
      }
      
      messages.forEach((msg, i) => {
        console.log(`      ${i + 1}. ${msg.contact_email}: "${msg.body_text?.substring(0, 20)}..."`)
      })
      console.log('')
    })
    
    // 3. Check how conversation IDs are supposed to be generated
    console.log('3. Expected conversation ID generation:')
    console.log('=' .repeat(60))
    
    // The webhook should generate conversation IDs based on contact email
    const testEmails = ['anthoy2327@gmail.com', 'ecomm2405@gmail.com', 'essabar.yassine@gmail.com']
    const campaignId = '73da410f-53a7-4cea-aa91-10e4b56c8fa9'
    
    testEmails.forEach(email => {
      // This is how the webhook generates conversation IDs
      const participants = [email, 'test@reply.leadsup.io'].sort().join('|')
      const base = participants + `|${campaignId}`
      const conversationId = Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
      
      console.log(`📧 ${email}`)
      console.log(`   Expected conversation ID: ${conversationId}`)
    })
    
    // 4. Check actual vs expected
    console.log('\n4. Actual vs Expected conversation IDs:')
    console.log('=' .repeat(60))
    
    for (const email of testEmails) {
      const participants = [email, 'test@reply.leadsup.io'].sort().join('|')
      const base = participants + `|${campaignId}`
      const expectedConvId = Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
      
      const actualMessage = recentMessages.find(m => m.contact_email === email && m.direction === 'inbound')
      if (actualMessage) {
        console.log(`📧 ${email}:`)
        console.log(`   Expected: ${expectedConvId}`)
        console.log(`   Actual:   ${actualMessage.conversation_id}`)
        console.log(`   Match:    ${expectedConvId === actualMessage.conversation_id ? '✅' : '❌'}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugConversationThreading()