#!/usr/bin/env node

/**
 * Manually fix the latest reply to show just the actual content
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function manualFixLatest() {
  try {
    console.log('🔧 Manual fix for latest reply\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Get the latest reply from anthoy2327@gmail.com
    const { data: latestReply, error: replyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', correctUserId)
      .eq('contact_email', 'anthoy2327@gmail.com')
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (replyError) {
      console.error('❌ Error finding reply:', replyError)
      return
    }
    
    console.log('Current content:')
    console.log(latestReply.body_text)
    
    // Extract just "mouhahahah\njtmmm"
    const actualReply = "mouhahahah\njtmmm"
    
    console.log('\nSetting clean content to:')
    console.log(`"${actualReply}"`)
    
    // Update with clean content
    const { error: updateError } = await supabase
      .from('inbox_messages')
      .update({
        body_text: actualReply,
        body_html: actualReply
      })
      .eq('id', latestReply.id)
    
    if (updateError) {
      console.error('❌ Update error:', updateError)
      return
    }
    
    // Update thread preview
    const { error: threadError } = await supabase
      .from('inbox_threads')
      .update({
        last_message_preview: actualReply.substring(0, 150)
      })
      .eq('conversation_id', latestReply.conversation_id)
      .eq('user_id', correctUserId)
    
    if (threadError) {
      console.error('❌ Thread error:', threadError)
    } else {
      console.log('✅ Thread preview updated')
    }
    
    console.log('✅ Manual fix applied!')
    console.log('📱 Refresh your inbox to see the clean content')
    
  } catch (error) {
    console.error('❌ Manual fix failed:', error)
  }
}

manualFixLatest()