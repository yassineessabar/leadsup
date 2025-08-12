#!/usr/bin/env node

/**
 * Find the missing reply messages and fix them
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function findMissingReplies() {
  try {
    console.log('🔍 Finding missing reply messages\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Check all recent messages regardless of user
    console.log('1. All recent messages (last 2 hours):')
    console.log('=' .repeat(50))
    
    const { data: allMessages, error: allError } = await supabase
      .from('inbox_messages')
      .select('user_id, contact_email, subject, direction, folder, created_at')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ Error:', allError)
      return
    }
    
    console.log(`📧 Found ${allMessages.length} recent messages:`)
    allMessages.forEach((msg, i) => {
      const userMatch = msg.user_id === correctUserId ? '✅' : '❌'
      console.log(`${i + 1}. ${msg.direction} - ${msg.contact_email} ${userMatch}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   User: ${msg.user_id}`)
      console.log(`   Folder: ${msg.folder}`)
      console.log(`   Time: ${new Date(msg.created_at).toLocaleTimeString()}`)
      console.log('')
    })
    
    // 2. Find reply messages with wrong user or folder
    const replyMessages = allMessages.filter(m => 
      m.direction === 'inbound' && 
      (m.user_id !== correctUserId || m.folder !== 'inbox')
    )
    
    console.log('2. Reply messages to fix:')
    console.log('=' .repeat(50))
    console.log(`📧 Found ${replyMessages.length} reply messages that need fixing`)
    
    if (replyMessages.length === 0) {
      console.log('✅ No reply messages need fixing!')
      
      // Check if we have any inbound messages at all
      const anyInbound = allMessages.filter(m => m.direction === 'inbound')
      console.log(`📧 Total inbound messages: ${anyInbound.length}`)
      
      if (anyInbound.length === 0) {
        console.log('❌ No inbound messages found - replies may not be captured yet')
        console.log('🔄 Try replying to the campaign email again')
      }
      
      return
    }
    
    // 3. Fix each reply message
    for (const message of replyMessages) {
      console.log(`\nFixing: ${message.contact_email}`)
      console.log(`  Current user: ${message.user_id}`)
      console.log(`  Current folder: ${message.folder}`)
      
      const updates = {}
      
      if (message.user_id !== correctUserId) {
        updates.user_id = correctUserId
        console.log(`  → Will update user_id to: ${correctUserId}`)
      }
      
      if (message.folder !== 'inbox') {
        updates.folder = 'inbox'
        console.log(`  → Will update folder to: inbox`)
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('inbox_messages')
          .update(updates)
          .eq('contact_email', message.contact_email)
          .eq('direction', 'inbound')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        
        if (updateError) {
          console.error(`  ❌ Update error:`, updateError)
        } else {
          console.log(`  ✅ Updated successfully`)
        }
      }
    }
    
    // 4. Verify fix
    console.log('\n4. Verifying fix:')
    console.log('=' .repeat(50))
    
    const { data: fixedMessages, error: fixedError } = await supabase
      .from('inbox_messages')
      .select('contact_email, direction, folder, user_id')
      .eq('user_id', correctUserId)
      .eq('folder', 'inbox')
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    
    if (fixedError) {
      console.error('❌ Verify error:', fixedError)
    } else {
      console.log(`✅ Inbound messages in inbox for correct user: ${fixedMessages.length}`)
      fixedMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.contact_email}`)
      })
      
      if (fixedMessages.length > 0) {
        console.log('\n🎉 REPLIES FIXED!')
        console.log('📱 Refresh your inbox - replies should now appear!')
      }
    }
    
  } catch (error) {
    console.error('❌ Find failed:', error)
  }
}

findMissingReplies()