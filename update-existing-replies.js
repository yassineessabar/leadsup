#!/usr/bin/env node

/**
 * Update existing replies to use improved parsing
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Decode quoted-printable encoding
function decodeQuotedPrintable(text) {
  if (!text) return text
  
  return text
    // Decode soft line breaks (=\n)
    .replace(/=\r?\n/g, '')
    // Decode hex-encoded characters (=XX)
    .replace(/=([0-9A-F]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    // Clean up any remaining quoted-printable artifacts
    .replace(/=$/gm, '')
}

// Extract actual reply content from email
function extractActualReply(text) {
  if (!text) return ''
  
  let cleanText = text
  
  // First, decode quoted-printable
  cleanText = decodeQuotedPrintable(cleanText)
  
  // Remove "Content-Transfer-Encoding" lines
  cleanText = cleanText.replace(/Content-Transfer-Encoding: .+?\n/gi, '')
  
  // Find the actual reply by splitting on "On ... wrote:" pattern
  const onWroteMatch = cleanText.match(/(.*?)On .+? wrote:/is)
  if (onWroteMatch) {
    cleanText = onWroteMatch[1].trim()
  }
  
  // Remove quoted lines (lines starting with >)
  const lines = cleanText.split('\n')
  const replyLines = lines.filter(line => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith('>')
  })
  
  return replyLines.join('\n').trim()
}

async function updateExistingReplies() {
  try {
    console.log('🔧 Updating existing replies with improved parsing\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Get recent inbound messages that need cleaning
    console.log('1. Getting recent inbound messages:')
    console.log('=' .repeat(50))
    
    const { data: inboundMessages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', correctUserId)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
    
    if (msgError) {
      console.error('❌ Error:', msgError)
      return
    }
    
    console.log(`📧 Found ${inboundMessages.length} recent inbound messages to clean:`)
    inboundMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.contact_email}`)
      console.log(`   Current text: "${msg.body_text?.substring(0, 50)}..."`)
    })
    
    if (inboundMessages.length === 0) {
      console.log('✅ No messages to update!')
      return
    }
    
    // 2. Update each message with cleaned content
    for (const message of inboundMessages) {
      console.log(`\n🔧 Cleaning: ${message.contact_email}`)
      
      const originalText = message.body_text || ''
      const originalHtml = message.body_html || ''
      
      const cleanedText = extractActualReply(originalText) || originalText
      const cleanedHtml = extractActualReply(originalHtml) || originalHtml
      
      console.log(`   Original text: "${originalText.substring(0, 100)}..."`)
      console.log(`   Cleaned text: "${cleanedText}"`)
      
      if (cleanedText !== originalText || cleanedHtml !== originalHtml) {
        const { error: updateError } = await supabase
          .from('inbox_messages')
          .update({
            body_text: cleanedText,
            body_html: cleanedHtml
          })
          .eq('id', message.id)
        
        if (updateError) {
          console.error(`  ❌ Update error:`, updateError)
        } else {
          console.log(`  ✅ Content cleaned`)
        }
        
        // Also update thread preview
        const { error: threadError } = await supabase
          .from('inbox_threads')
          .update({
            last_message_preview: cleanedText.substring(0, 150)
          })
          .eq('conversation_id', message.conversation_id)
          .eq('user_id', correctUserId)
        
        if (threadError) {
          console.log(`  ⚠️ Thread preview update: ${threadError.message}`)
        } else {
          console.log(`  ✅ Thread preview updated`)
        }
      } else {
        console.log(`  ⏭️ No cleaning needed`)
      }
    }
    
    // 3. Verify results
    console.log('\n3. Verifying cleaned content:')
    console.log('=' .repeat(50))
    
    const { data: cleanedMessages, error: verifyError } = await supabase
      .from('inbox_messages')
      .select('contact_email, body_text')
      .eq('user_id', correctUserId)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    if (verifyError) {
      console.error('❌ Verify error:', verifyError)
    } else {
      console.log(`✅ Cleaned messages:`)
      cleanedMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.contact_email}: "${msg.body_text}"`)
      })
    }
    
    console.log('\n🎉 EXISTING REPLIES CLEANED!')
    console.log('📱 Refresh your inbox - replies should now show clean content!')
    
  } catch (error) {
    console.error('❌ Update failed:', error)
  }
}

updateExistingReplies()