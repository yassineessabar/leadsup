#!/usr/bin/env node

/**
 * Final cleanup of message content to remove remaining artifacts
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Final content cleanup
function finalCleanup(text) {
  if (!text) return ''
  
  let cleaned = text
  
  // Remove Content-Transfer-Encoding lines
  cleaned = cleaned.replace(/Content-Transfer-Encoding: .+?\n/gi, '')
  
  // Remove any remaining header-like lines at the start
  const lines = cleaned.split('\n')
  const contentLines = []
  let skipHeaders = true
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines and header-like lines at the start
    if (skipHeaders) {
      if (trimmed === '') continue
      if (trimmed.includes('Content-') || trimmed.includes('MIME-') || trimmed.includes(':') && trimmed.length < 50) {
        continue
      }
      skipHeaders = false
    }
    
    // Include this line
    contentLines.push(trimmed)
  }
  
  return contentLines.join('\n').trim()
}

async function finalContentCleanup() {
  try {
    console.log('🧹 Final content cleanup\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Get messages that still have "Content-Transfer-Encoding"
    const { data: messagesWithHeaders, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', correctUserId)
      .eq('direction', 'inbound')
      .like('body_text', '%Content-Transfer-Encoding%')
    
    if (msgError) {
      console.error('❌ Error:', msgError)
      return
    }
    
    console.log(`📧 Found ${messagesWithHeaders.length} messages with header artifacts:`)
    
    for (const message of messagesWithHeaders) {
      console.log(`\n🔧 Final cleanup: ${message.contact_email}`)
      
      const originalText = message.body_text || ''
      const cleanedText = finalCleanup(originalText)
      
      console.log(`   Before: "${originalText}"`)
      console.log(`   After: "${cleanedText}"`)
      
      if (cleanedText !== originalText) {
        const { error: updateError } = await supabase
          .from('inbox_messages')
          .update({
            body_text: cleanedText,
            body_html: cleanedText // Use cleaned text for HTML too
          })
          .eq('id', message.id)
        
        if (updateError) {
          console.error(`  ❌ Update error:`, updateError)
        } else {
          console.log(`  ✅ Final cleanup applied`)
        }
        
        // Update thread preview
        const { error: threadError } = await supabase
          .from('inbox_threads')
          .update({
            last_message_preview: cleanedText.substring(0, 150)
          })
          .eq('conversation_id', message.conversation_id)
          .eq('user_id', correctUserId)
        
        if (threadError) {
          console.log(`  ⚠️ Thread preview: ${threadError.message}`)
        } else {
          console.log(`  ✅ Thread preview cleaned`)
        }
      }
    }
    
    // Final verification
    console.log('\n📋 Final verification:')
    console.log('=' .repeat(50))
    
    const { data: finalMessages, error: finalError } = await supabase
      .from('inbox_messages')
      .select('contact_email, body_text')
      .eq('user_id', correctUserId)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    if (finalError) {
      console.error('❌ Final check error:', finalError)
    } else {
      console.log('✅ Final message content:')
      finalMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.contact_email}: "${msg.body_text}"`)
      })
    }
    
    console.log('\n🎉 FINAL CLEANUP COMPLETE!')
    console.log('📱 Your inbox now shows clean reply content!')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

finalContentCleanup()