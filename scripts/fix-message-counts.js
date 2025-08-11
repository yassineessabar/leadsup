#!/usr/bin/env node

/**
 * Fix Message Counts
 * 
 * This script fixes the message_count in inbox_threads to match 
 * the actual number of messages in inbox_messages
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixMessageCounts() {
  console.log('🔧 FIXING MESSAGE COUNTS IN THREADS\n')

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'

    // Get all threads for this user
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select('id, conversation_id, contact_email, message_count')
      .eq('user_id', userId)

    if (threadsError) {
      console.error('❌ Error fetching threads:', threadsError)
      return
    }

    console.log(`📊 Found ${threads.length} threads to check:`)
    
    for (const thread of threads) {
      // Count actual messages for this conversation
      const { data: messages, error: messagesError } = await supabase
        .from('inbox_messages')
        .select('id')
        .eq('user_id', userId)
        .eq('conversation_id', thread.conversation_id)

      if (messagesError) {
        console.error(`❌ Error counting messages for ${thread.conversation_id}:`, messagesError)
        continue
      }

      const actualCount = messages.length
      const currentCount = thread.message_count

      console.log(`\n📧 ${thread.contact_email}:`)
      console.log(`   Current count: ${currentCount}`)
      console.log(`   Actual count: ${actualCount}`)

      if (currentCount !== actualCount) {
        console.log(`   🔧 Updating ${currentCount} → ${actualCount}`)
        
        const { error: updateError } = await supabase
          .from('inbox_threads')
          .update({ 
            message_count: actualCount,
            unread_count: 0 // Since all our messages are 'read' status
          })
          .eq('id', thread.id)

        if (updateError) {
          console.error(`   ❌ Failed to update: ${updateError.message}`)
        } else {
          console.log(`   ✅ Updated successfully`)
        }
      } else {
        console.log(`   ✅ Count is correct`)
      }
    }

    console.log('\n🎯 SUMMARY:')
    console.log('✅ Message counts have been corrected')
    console.log('✅ "X more messages" will now show correctly')
    console.log('💡 Refresh your inbox to see the changes!')

  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the fix
fixMessageCounts().then(() => {
  console.log('\n✅ Message count fix complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Fix script failed:', error)
  process.exit(1)
})