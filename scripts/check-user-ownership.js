#!/usr/bin/env node

/**
 * Check User Ownership Script
 * 
 * This script checks which users own which campaigns and emails
 * to help debug why emails aren't showing in the UI.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserOwnership() {
  console.log('🔍 CHECKING USER OWNERSHIP OF CAMPAIGNS AND EMAILS\n')

  try {
    // Get all users
    console.log('👥 Getting all users...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(10)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log(`📊 Found ${users.length} users:`)
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) | ID: ${user.id}`)
      })
    }

    console.log('\n🎯 Checking campaign ownership...')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, user_id, status')
      .eq('status', 'Active')

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError)
    } else {
      console.log(`📊 Found ${campaigns.length} active campaigns:`)
      campaigns.forEach((campaign, index) => {
        console.log(`  ${index + 1}. "${campaign.name}" | User: ${campaign.user_id}`)
      })
    }

    console.log('\n📧 Checking inbox messages ownership...')
    const { data: messages, error: messagesError } = await supabase
      .from('inbox_messages')
      .select('id, user_id, contact_email, subject, direction')

    if (messagesError) {
      console.error('❌ Error fetching inbox messages:', messagesError)
    } else {
      console.log(`📊 Found ${messages.length} inbox messages:`)
      
      // Group by user_id
      const messagesByUser = messages.reduce((acc, msg) => {
        if (!acc[msg.user_id]) acc[msg.user_id] = []
        acc[msg.user_id].push(msg)
        return acc
      }, {})

      Object.entries(messagesByUser).forEach(([userId, userMessages]) => {
        console.log(`\n📬 User ${userId} has ${userMessages.length} messages:`)
        userMessages.forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg.direction} | ${msg.contact_email} | ${msg.subject}`)
        })
      })
    }

    console.log('\n🧵 Checking inbox threads ownership...')
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select('id, user_id, contact_email, subject')

    if (threadsError) {
      console.error('❌ Error fetching inbox threads:', threadsError)
    } else {
      console.log(`📊 Found ${threads.length} inbox threads:`)
      
      // Group by user_id
      const threadsByUser = threads.reduce((acc, thread) => {
        if (!acc[thread.user_id]) acc[thread.user_id] = []
        acc[thread.user_id].push(thread)
        return acc
      }, {})

      Object.entries(threadsByUser).forEach(([userId, userThreads]) => {
        console.log(`\n🧵 User ${userId} has ${userThreads.length} threads:`)
        userThreads.forEach((thread, index) => {
          console.log(`  ${index + 1}. ${thread.contact_email} | ${thread.subject}`)
        })
      })
    }

    // Check which user is associated with the test campaigns
    console.log('\n🔍 Cross-referencing campaigns with messages...')
    const testCampaignUser = campaigns.find(c => c.name === 'TEST FRERO')
    if (testCampaignUser) {
      console.log(`🎯 "TEST FRERO" campaign belongs to user: ${testCampaignUser.user_id}`)
      
      const userMessages = messages.filter(m => m.user_id === testCampaignUser.user_id)
      const userThreads = threads.filter(t => t.user_id === testCampaignUser.user_id)
      
      console.log(`📧 This user has ${userMessages.length} messages in inbox_messages`)
      console.log(`🧵 This user has ${userThreads.length} threads in inbox_threads`)
    }

  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the check
checkUserOwnership().then(() => {
  console.log('\n✅ User ownership check complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})