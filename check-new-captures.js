#!/usr/bin/env node

/**
 * Check the user IDs of newly captured replies
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkNewCaptures() {
  try {
    console.log('🔍 Checking newly captured replies\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Check all recent captures
    console.log('1. Recent captured messages:')
    console.log('=' .repeat(50))
    const { data: recentMessages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('user_id, contact_email, subject, created_at, conversation_id')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (msgError) {
      console.error('❌ Error:', msgError)
      return
    }
    
    console.log(`📧 Found ${recentMessages.length} recent messages:`)
    recentMessages.forEach((msg, i) => {
      const userMatch = msg.user_id === correctUserId ? '✅' : '❌'
      console.log(`${i + 1}. ${msg.contact_email} - User: ${msg.user_id} ${userMatch}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Time: ${new Date(msg.created_at).toLocaleTimeString()}`)
      console.log('')
    })
    
    // 2. Check which user IDs are being used
    console.log('2. User ID analysis:')
    console.log('=' .repeat(50))
    const userIds = [...new Set(recentMessages.map(m => m.user_id))]
    console.log('🔍 FRONTEND EXPECTS: 1ecada7a-a538-4ee5-a193-14f5c482f387')
    console.log('📧 CAPTURED MESSAGES HAVE:')
    userIds.forEach((uid, i) => {
      const count = recentMessages.filter(m => m.user_id === uid).length
      const isCorrect = uid === correctUserId ? '✅ CORRECT' : '❌ WRONG'
      console.log(`${i + 1}. ${uid} (${count} messages) ${isCorrect}`)
    })
    
    // 3. Check threads
    console.log('\n3. Recent threads:')
    console.log('=' .repeat(50))
    const { data: recentThreads, error: threadError } = await supabase
      .from('inbox_threads')
      .select('user_id, contact_email, subject, created_at, conversation_id')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (threadError) {
      console.error('❌ Thread error:', threadError)
    } else {
      console.log(`🧵 Found ${recentThreads.length} recent threads:`)
      recentThreads.forEach((thread, i) => {
        const userMatch = thread.user_id === correctUserId ? '✅' : '❌'
        console.log(`${i + 1}. ${thread.contact_email} - User: ${thread.user_id} ${userMatch}`)
        console.log(`   Subject: ${thread.subject}`)
        console.log('')
      })
    }
    
    // 4. Test inbox query with wrong user ID
    const wrongMessages = recentMessages.filter(m => m.user_id !== correctUserId)
    if (wrongMessages.length > 0) {
      console.log('4. Testing with wrong user ID:')
      console.log('=' .repeat(50))
      const wrongUserId = wrongMessages[0].user_id
      console.log(`🔍 Testing inbox query with wrong user ID: ${wrongUserId}`)
      
      const { data: wrongUserInbox, error: wrongError } = await supabase
        .from('inbox_messages')
        .select('conversation_id')
        .eq('user_id', wrongUserId)
        .eq('folder', 'inbox')
        .eq('channel', 'email')
      
      if (wrongError) {
        console.error('❌ Wrong user query error:', wrongError)
      } else {
        const wrongThreadIds = [...new Set(wrongUserInbox.map(m => m.conversation_id))]
        console.log(`📁 Wrong user has ${wrongUserInbox.length} messages, ${wrongThreadIds.length} threads`)
        console.log('❌ This explains why inbox is empty - replies have wrong user ID!')
      }
    }
    
    console.log('\n🔧 SOLUTION NEEDED:')
    console.log('The webhook is still creating messages with wrong user ID')
    console.log('Need to fix the webhook to use correct user ID from campaign')
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkNewCaptures()