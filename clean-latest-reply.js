#!/usr/bin/env node

/**
 * Clean the latest reply that still has encoded content
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

async function cleanLatestReply() {
  try {
    console.log('🧹 Cleaning latest reply with encoded content\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Find the latest reply with encoded content
    const { data: latestReply, error: replyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', correctUserId)
      .eq('direction', 'inbound')
      .like('body_text', '%Content-Transfer-Encoding%')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (replyError) {
      console.log('✅ No encoded replies found to clean')
      return
    }
    
    console.log(`🔧 Cleaning: ${latestReply.contact_email}`)
    console.log(`   Subject: ${latestReply.subject}`)
    console.log(`   Current content: "${latestReply.body_text?.substring(0, 100)}..."`)
    
    const cleanedText = extractActualReply(latestReply.body_text)
    console.log(`   Cleaned content: "${cleanedText}"`)
    
    if (cleanedText && cleanedText !== latestReply.body_text) {
      // Update the message
      const { error: updateError } = await supabase
        .from('inbox_messages')
        .update({
          body_text: cleanedText,
          body_html: cleanedText
        })
        .eq('id', latestReply.id)
      
      if (updateError) {
        console.error('❌ Update error:', updateError)
        return
      }
      
      console.log('✅ Message content updated')
      
      // Update thread preview
      const { error: threadError } = await supabase
        .from('inbox_threads')
        .update({
          last_message_preview: cleanedText.substring(0, 150)
        })
        .eq('conversation_id', latestReply.conversation_id)
        .eq('user_id', correctUserId)
      
      if (threadError) {
        console.log(`⚠️ Thread preview: ${threadError.message}`)
      } else {
        console.log('✅ Thread preview updated')
      }
      
      console.log('\n🎉 Latest reply cleaned successfully!')
      console.log('📱 Refresh your inbox - the reply should now show clean content!')
      
    } else {
      console.log('⏭️ No cleaning needed or extraction failed')
    }
    
  } catch (error) {
    console.error('❌ Clean failed:', error)
  }
}

cleanLatestReply()