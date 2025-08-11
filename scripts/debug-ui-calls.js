#!/usr/bin/env node

/**
 * Debug UI Calls
 * 
 * This script helps debug what's happening when the UI calls the inbox API
 * by monitoring the server logs and checking the actual user making requests.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugUserSessions() {
  console.log('🔍 DEBUGGING USER SESSIONS AND INBOX ACCESS\n')

  try {
    // Check all active user sessions
    console.log('👥 Active User Sessions:')
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError)
    } else {
      console.log(`📊 Found ${sessions.length} active sessions:`)
      sessions.forEach((session, index) => {
        console.log(`  ${index + 1}. User: ${session.user_id}`)
        console.log(`     Session Token: ${session.session_token?.substring(0, 20)}...`)
        console.log(`     Created: ${session.created_at}`)
        console.log(`     Expires: ${session.expires_at}`)
        console.log()
      })
    }

    // Check which users have inbox data
    console.log('📧 Users with Inbox Data:')
    
    const { data: usersWithInbox, error: inboxError } = await supabase
      .rpc('get_inbox_user_stats', {})
      .select()

    // If RPC doesn't exist, do it manually
    const { data: inboxStats, error: statsError } = await supabase
      .from('inbox_messages')
      .select('user_id, folder, direction')

    if (statsError) {
      console.error('❌ Error fetching inbox stats:', statsError)
    } else {
      const userStats = inboxStats.reduce((acc, msg) => {
        if (!acc[msg.user_id]) {
          acc[msg.user_id] = { sent: 0, inbox: 0, total: 0 }
        }
        acc[msg.user_id].total++
        if (msg.folder === 'sent') acc[msg.user_id].sent++
        if (msg.folder === 'inbox') acc[msg.user_id].inbox++
        return acc
      }, {})

      console.log('📊 Inbox message counts by user:')
      Object.entries(userStats).forEach(([userId, stats]) => {
        console.log(`  User ${userId}:`)
        console.log(`    Total: ${stats.total}, Sent: ${stats.sent}, Inbox: ${stats.inbox}`)
      })
    }

    // Check campaigns by user
    console.log('\n🎯 Campaign Ownership:')
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('user_id, name, status')
      .eq('status', 'Active')

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError)
    } else {
      const campaignsByUser = campaigns.reduce((acc, campaign) => {
        if (!acc[campaign.user_id]) acc[campaign.user_id] = []
        acc[campaign.user_id].push(campaign.name)
        return acc
      }, {})

      Object.entries(campaignsByUser).forEach(([userId, userCampaigns]) => {
        console.log(`  User ${userId}: ${userCampaigns.length} campaigns`)
        userCampaigns.forEach(name => console.log(`    - ${name}`))
      })
    }

    console.log('\n🎯 DEBUGGING CHECKLIST FOR YOU:')
    console.log('1. Open your browser and go to the inbox')
    console.log('2. Open Developer Tools (F12)')
    console.log('3. Go to Application tab → Cookies')
    console.log('4. Look for the "session" cookie and copy its value')
    console.log('5. Check which user_id this session belongs to in the list above')
    console.log('6. Verify if that user has inbox messages in the stats above')
    console.log()
    console.log('🔧 QUICK FIXES:')
    console.log('Option 1: If your session user has no inbox data:')
    console.log('  - Send some test emails from that user\'s campaigns')
    console.log('Option 2: If your session belongs to wrong user:')
    console.log('  - Logout and login as the user with inbox data')
    console.log('Option 3: If you want to see the working data now:')
    console.log('  - Login as user: e863d418-b24a-4d15-93c6-28f56f4cfad8')

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

async function simulateUICall() {
  console.log('\n📞 SIMULATING TYPICAL UI CALL TO INBOX API')
  console.log('This shows what should happen when the UI calls the API:\n')

  try {
    const userId = 'e863d418-b24a-4d15-93c6-28f56f4cfad8' // User with known data
    const folder = 'sent'
    const channel = 'email'

    // Step 1: Get conversation IDs for folder
    const { data: messagesInFolder } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('folder', folder)
      .eq('channel', channel)

    const threadIds = [...new Set(messagesInFolder.map(m => m.conversation_id))]

    // Step 2: Get threads
    const { data: threads } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .in('conversation_id', threadIds)
      .order('last_message_at', { ascending: false })
      .limit(20)

    // Step 3: Get latest messages
    const formattedThreads = await Promise.all(
      threads.map(async (thread) => {
        const { data: latestMessage } = await supabase
          .from('inbox_messages')
          .select('id, subject, body_text, direction, status, sent_at, sender_email, contact_email, folder')
          .eq('user_id', userId)
          .eq('conversation_id', thread.conversation_id)
          .order('sent_at', { ascending: false, nullsLast: true })
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: thread.id,
          conversation_id: thread.conversation_id,
          subject: thread.subject,
          contact_name: thread.contact_name,
          contact_email: thread.contact_email,
          message_count: thread.message_count,
          unread_count: thread.unread_count,
          last_message_at: thread.last_message_at,
          latest_message: latestMessage
        }
      })
    )

    console.log('✅ API Call Result:')
    console.log(`   Found: ${formattedThreads.length} conversations`)
    console.log(`   User: ${userId}`)
    console.log(`   Folder: ${folder}`)
    console.log()
    console.log('📧 Conversations:')
    formattedThreads.forEach((thread, i) => {
      console.log(`   ${i + 1}. ${thread.contact_name} (${thread.contact_email?.trim()})`)
      console.log(`      Subject: ${thread.subject}`)
      console.log(`      Messages: ${thread.message_count}`)
      console.log(`      Latest: ${thread.latest_message?.direction} - ${thread.latest_message?.sent_at}`)
      console.log()
    })

    console.log('💡 If your UI shows "No emails found" but this shows data,')
    console.log('   the issue is user authentication in the browser!')

  } catch (error) {
    console.error('❌ Simulation failed:', error)
  }
}

// Run debug
async function main() {
  await debugUserSessions()
  await simulateUICall()
  
  console.log('\n✅ Debug complete')
  console.log('\n🎯 NEXT ACTION: Check your browser session cookie!')
  process.exit(0)
}

main().catch(error => {
  console.error('❌ Debug script failed:', error)
  process.exit(1)
})