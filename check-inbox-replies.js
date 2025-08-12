#!/usr/bin/env node

/**
 * Simple, clean checker for captured email replies
 * Usage: node check-inbox-replies.js
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkInboxReplies() {
  console.log('📥 CAPTURED EMAIL REPLIES')
  console.log('========================\n')
  
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('contact_email, subject, body_text, created_at, sender_email')
      .eq('direction', 'inbound')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('❌ Database error:', error.message)
      return
    }
    
    if (!messages || messages.length === 0) {
      console.log('❌ No replies captured in the last 24 hours')
      console.log('\nTo test: node test-send-real-email.js your@email.com')
    } else {
      console.log(`✅ Found ${messages.length} captured replies:\n`)
      
      messages.forEach((msg, i) => {
        const timeAgo = Math.round((Date.now() - new Date(msg.created_at).getTime()) / 60000)
        
        console.log(`${i + 1}. 📧 ${msg.contact_email}`)
        console.log(`   ➜ To: ${msg.sender_email}`)  
        console.log(`   📝 ${msg.subject}`)
        console.log(`   💬 ${msg.body_text?.substring(0, 80) || 'No text content'}...`)
        console.log(`   🕒 ${timeAgo} minutes ago`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Failed to check replies:', error.message)
  }
}

// Run the check
checkInboxReplies().catch(console.error)