#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCurrentUser() {
  console.log('🔍 Checking which user the dashboard is authenticated as...\n')
  
  try {
    // 1. Find all users and their email activity
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError)
      return
    }
    
    console.log('👥 All users in system:')
    
    for (const user of users) {
      // Check email activity for each user
      const { data: messages, error: msgError } = await supabase
        .from('inbox_messages')
        .select('direction')
        .eq('user_id', user.id)
      
      const outbound = messages ? messages.filter(m => m.direction === 'outbound').length : 0
      const inbound = messages ? messages.filter(m => m.direction === 'inbound').length : 0
      
      console.log(`   ${user.email || 'No email'} (${user.id})`)
      console.log(`     📤 Sent: ${outbound}, 📥 Received: ${inbound}`)
      
      if (outbound > 0) {
        console.log(`     ✅ HAS EMAIL ACTIVITY - should show metrics`)
      } else {
        console.log(`     ⚠️ No email activity`)
      }
    }
    
    // 2. Find the most recent active session (likely current user)
    const { data: recentSession, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, session_token, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    console.log('\n🔐 Most recent active session:')
    if (sessionError) {
      console.log('❌ Error:', sessionError)
    } else if (recentSession) {
      console.log(`   User ID: ${recentSession.user_id}`)
      console.log(`   Session: ${recentSession.session_token.substring(0, 20)}...`)
      
      // Check if this user has email activity
      const { data: currentUserMessages, error: currentMsgError } = await supabase
        .from('inbox_messages')
        .select('direction, created_at')
        .eq('user_id', recentSession.user_id)
      
      if (!currentMsgError && currentUserMessages) {
        const outbound = currentUserMessages.filter(m => m.direction === 'outbound').length
        console.log(`\n👤 Current user email activity:`)
        console.log(`   📤 Sent emails: ${outbound}`)
        console.log(`   📥 Received emails: ${currentUserMessages.filter(m => m.direction === 'inbound').length}`)
        
        if (outbound === 0) {
          console.log('\n🚨 PROBLEM IDENTIFIED:')
          console.log('   The currently logged-in user has NO email activity!')
          console.log('   Dashboard correctly shows "No Email Performance Data"')
          console.log('\n💡 SOLUTIONS:')
          console.log('   1. Log in as the user with email activity')
          console.log('   2. Or send emails from the current user account')
          console.log(`   3. User with activity: 16bec73e-34e5-4f25-b3dc-da19906d0a54`)
        } else {
          console.log('\n✅ Current user HAS email activity - dashboard should show metrics')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkCurrentUser().catch(console.error)