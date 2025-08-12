#!/usr/bin/env node

/**
 * Debug script to analyze what fields SendGrid is actually sending
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function analyzeRecentReplies() {
  try {
    console.log('🔍 Analyzing recent email replies for content detection\n')
    
    // Get the most recent 3 replies
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false })
      .limit(3)
    
    if (error) {
      console.error('❌ Error fetching messages:', error)
      return
    }
    
    if (!messages || messages.length === 0) {
      console.log('📭 No messages found')
      return
    }
    
    console.log(`📊 Analyzing ${messages.length} recent replies:\n`)
    
    messages.forEach((message, i) => {
      console.log(`${i + 1}. Message ID: ${message.id}`)
      console.log(`   Subject: ${message.subject}`)
      console.log(`   Received: ${new Date(message.received_at).toLocaleString()}`)
      console.log(`   Body Text Length: ${message.body_text?.length || 0}`)
      console.log(`   Body HTML Length: ${message.body_html?.length || 0}`)
      
      if (message.body_text) {
        console.log(`   Text Preview: "${message.body_text.substring(0, 100)}..."`)
      }
      
      if (message.body_html) {
        console.log(`   HTML Preview: "${message.body_html.substring(0, 100)}..."`)
      }
      
      // Check provider_data for debugging info
      if (message.provider_data) {
        console.log(`   Provider Data Keys: ${Object.keys(message.provider_data || {}).join(', ')}`)
        
        // Look for any debug logs about field detection
        if (message.provider_data.debug || message.provider_data.fields) {
          console.log(`   Debug Info: ${JSON.stringify(message.provider_data.debug || message.provider_data.fields, null, 2)}`)
        }
      }
      
      console.log('')
    })
    
    // Check for any pattern in successful vs failed content extraction
    const withContent = messages.filter(m => m.body_text?.length > 0 || m.body_html?.length > 0)
    const withoutContent = messages.filter(m => (!m.body_text || m.body_text.length === 0) && (!m.body_html || m.body_html.length === 0))
    
    console.log('📈 Content Detection Analysis:')
    console.log(`   Messages with content: ${withContent.length}`)
    console.log(`   Messages without content: ${withoutContent.length}`)
    
    if (withContent.length > 0) {
      console.log('\n✅ Successful content extraction examples:')
      withContent.slice(0, 2).forEach(msg => {
        console.log(`   "${msg.subject}" - Text: ${msg.body_text?.length || 0} chars, HTML: ${msg.body_html?.length || 0} chars`)
      })
    }
    
    if (withoutContent.length > 0) {
      console.log('\n❌ Failed content extraction examples:')
      withoutContent.slice(0, 2).forEach(msg => {
        console.log(`   "${msg.subject}" - No content detected`)
      })
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
  }
}

analyzeRecentReplies()