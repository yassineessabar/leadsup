#!/usr/bin/env node

// Debug why the dashboard still shows "No Email Performance Data"

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugDashboardAPI() {
  console.log('🔍 Debugging why dashboard shows "No Email Performance Data"...\n')
  
  try {
    // 1. Check if there are any active user sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('🔐 Recent user sessions:')
    if (sessionError) {
      console.log('❌ Error:', sessionError)
    } else if (sessions && sessions.length > 0) {
      sessions.forEach((session, i) => {
        const isExpired = new Date(session.expires_at) < new Date()
        console.log(`   ${i + 1}. User ${session.user_id} - ${isExpired ? 'EXPIRED' : 'ACTIVE'}`)
      })
      
      // Find an active session
      const activeSession = sessions.find(s => new Date(s.expires_at) > new Date())
      if (activeSession) {
        console.log(`\n👤 Testing with active user: ${activeSession.user_id}`)
        
        // 2. Check this user's email data
        const { data: userMessages, error: messageError } = await supabase
          .from('inbox_messages')
          .select('direction, created_at')
          .eq('user_id', activeSession.user_id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        console.log('\n📧 User email messages:')
        if (messageError) {
          console.log('❌ Error:', messageError)
        } else if (userMessages && userMessages.length > 0) {
          const outbound = userMessages.filter(m => m.direction === 'outbound').length
          const inbound = userMessages.filter(m => m.direction === 'inbound').length
          
          console.log(`✅ Found ${userMessages.length} messages`)
          console.log(`   📤 Outbound: ${outbound}`)
          console.log(`   📥 Inbound: ${inbound}`)
          
          if (outbound > 0) {
            console.log('\n✅ This user HAS email activity - dashboard should show metrics!')
          } else {
            console.log('\n⚠️ This user has no outbound emails')
          }
        } else {
          console.log('⚠️ No messages found for this user')
        }
        
        // 3. Test the analytics API endpoint manually
        console.log('\n🧪 Testing analytics API endpoint...')
        
        // Simulate the API call
        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        console.log(`📅 Date range: ${startDate} to ${endDate}`)
        console.log(`👤 User ID: ${activeSession.user_id}`)
        
        // Check if the UserSpecificAnalytics would work
        const { data: testMessages, error: testError } = await supabase
          .from('inbox_messages')
          .select('*')
          .eq('user_id', activeSession.user_id)
          .gte('created_at', startDate + 'T00:00:00Z')
          .lte('created_at', endDate + 'T23:59:59Z')
        
        console.log('\n📊 Messages in date range:')
        if (testError) {
          console.log('❌ Error:', testError)
        } else if (testMessages && testMessages.length > 0) {
          const sentEmails = testMessages.filter(m => m.direction === 'outbound').length
          console.log(`✅ Found ${testMessages.length} messages in range`)
          console.log(`📤 Sent emails: ${sentEmails}`)
          
          if (sentEmails > 0) {
            console.log('\n🎯 SHOULD SHOW METRICS:')
            console.log(`   📤 Emails Sent: ${sentEmails}`)
            console.log(`   📬 Delivery Rate: 100%`)
            console.log('\n❓ If dashboard still shows "No Email Performance Data",')
            console.log('   the issue is likely in:')
            console.log('   1. Session authentication')
            console.log('   2. API endpoint routing')
            console.log('   3. Frontend fetch calls')
          }
        } else {
          console.log('⚠️ No messages in date range - explains "No Email Performance Data"')
        }
        
      } else {
        console.log('\n⚠️ No active sessions found - users need to log in')
      }
    } else {
      console.log('⚠️ No user sessions found')
    }
    
    // 4. Check if the analytics API route exists
    console.log('\n🔗 Checking analytics API route...')
    console.log('   Expected: /api/analytics/account')
    console.log('   Check: app/api/analytics/account/route.ts exists')
    
    // 5. Check dashboard fetch logic
    console.log('\n🔍 Dashboard should be calling:')
    console.log('   1. /api/inbox/stats (for inbox check)')
    console.log('   2. /api/analytics/account?start_date=...&end_date=... (for metrics)')
    console.log('   3. Both with credentials: "include"')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugDashboardAPI().catch(console.error)