#!/usr/bin/env node

// Simple version that bypasses environment validation for now

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

// Use environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Environment check:')
console.log('  SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET')
console.log('  SERVICE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET')
console.log('')

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️ Missing environment variables. Checking for fake events pattern anyway...')
  console.log('📊 The fake data has these characteristics:')
  console.log('   - Emails like contact1@example.com, contact2@example.com, etc.')
  console.log('   - Event IDs containing "demo", "fix", or "fake"')
  console.log('   - Creates exactly: 15 opens, 3 clicks, 50 sent, 46 delivered')
  console.log('')
  console.log('🧹 To remove fake data:')
  console.log('   1. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.log('   2. Run this script again')
  console.log('   3. Or manually remove events from sendgrid_events table')
  return
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearFakeAnalytics() {
  console.log('🧹 Clearing fake SendGrid analytics data...\n')
  
  try {
    // 1. Check what events exist
    const { data: allEvents, error: fetchError } = await supabase
      .from('sendgrid_events')
      .select('event_type, email, sg_event_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (fetchError) {
      console.error('❌ Error fetching events:', fetchError)
      return
    }
    
    console.log(`📊 Found ${allEvents?.length || 0} recent events`)
    
    if (allEvents && allEvents.length > 0) {
      console.log('🔍 Recent events:')
      allEvents.slice(0, 5).forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.event_type} - ${event.email} (${event.sg_event_id.substring(0, 20)}...)`)
      })
      console.log('')
    }
    
    // 2. Look for fake/demo events (the exact patterns from the scripts)
    const { data: fakeEvents, error: fakeError } = await supabase
      .from('sendgrid_events')
      .select('*')
      .or('email.like.%example.com%,email.like.%demo%,email.like.%test%,sg_event_id.like.%demo%,sg_event_id.like.%fix%,sg_event_id.like.%fake%')
    
    if (fakeError) {
      console.error('❌ Error finding fake events:', fakeError)
      return
    }
    
    console.log(`🎭 Found ${fakeEvents?.length || 0} fake/demo events`)
    
    if (fakeEvents && fakeEvents.length > 0) {
      console.log('🗑️ Fake events to delete:')
      
      // Group by event type for better visualization
      const eventsByType = fakeEvents.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1
        return acc
      }, {})
      
      console.log('   Event breakdown:')
      Object.entries(eventsByType).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`)
      })
      
      // Show some examples
      console.log('   Examples:')
      fakeEvents.slice(0, 3).forEach((event, i) => {
        console.log(`     ${i + 1}. ${event.event_type} - ${event.email}`)
      })
      
      // Delete fake events
      console.log('\n🗑️ Deleting fake events...')
      const { error: deleteError } = await supabase
        .from('sendgrid_events')
        .delete()
        .or('email.like.%example.com%,email.like.%demo%,email.like.%test%,sg_event_id.like.%demo%,sg_event_id.like.%fix%,sg_event_id.like.%fake%')
      
      if (deleteError) {
        console.error('❌ Error deleting fake events:', deleteError)
        return
      }
      
      console.log(`✅ Successfully deleted ${fakeEvents.length} fake events`)
    } else {
      console.log('✅ No fake events found!')
    }
    
    // 3. Check remaining events
    const { data: remainingEvents, count: remainingCount } = await supabase
      .from('sendgrid_events')
      .select('event_type', { count: 'exact' })
      .not('email', 'like', '%example.com%')
      .not('email', 'like', '%demo%')
      .not('email', 'like', '%test%')
    
    console.log(`\n📊 Remaining real events: ${remainingCount || 0}`)
    
    if (remainingCount > 0) {
      const eventTypeCounts = remainingEvents.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1
        return acc
      }, {})
      
      console.log('📈 Real event breakdown:')
      Object.entries(eventTypeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`)
      })
    } else {
      console.log('⚠️ No real email events remain')
      console.log('💡 Dashboard will now show "No Email Performance Data"')
    }
    
    console.log('\n✅ Analytics cleanup completed!')
    console.log('🔄 Refresh your dashboard - fake data should be gone!')
    
  } catch (error) {
    console.error('❌ Error clearing fake analytics:', error)
  }
}

clearFakeAnalytics().catch(console.error)