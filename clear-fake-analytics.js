#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('test') || supabaseServiceKey.includes('test')) {
  console.error('❌ Please set your real Supabase environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearFakeAnalytics() {
  console.log('🧹 Clearing fake SendGrid analytics data...\n')
  
  try {
    // 1. Check what events exist
    const { data: events, error: fetchError } = await supabase
      .from('sendgrid_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (fetchError) {
      console.error('❌ Error fetching events:', fetchError)
      return
    }
    
    console.log(`📊 Found ${events?.length || 0} recent events`)
    
    if (events && events.length > 0) {
      console.log('🔍 Sample events:')
      events.slice(0, 3).forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.event_type} - ${event.email} (${event.sg_event_id})`)
      })
      console.log('')
    }
    
    // 2. Look for fake/demo events (events that look like test data)
    const { data: fakeEvents, error: fakeError } = await supabase
      .from('sendgrid_events')
      .select('*')
      .or('email.like.%example.com%,email.like.%demo%,email.like.%test%,sg_event_id.like.%demo%,sg_event_id.like.%fix%')
    
    if (fakeError) {
      console.error('❌ Error finding fake events:', fakeError)
      return
    }
    
    console.log(`🎭 Found ${fakeEvents?.length || 0} potential fake/demo events`)
    
    if (fakeEvents && fakeEvents.length > 0) {
      console.log('🗑️ Fake events to delete:')
      fakeEvents.slice(0, 5).forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.event_type} - ${event.email} (${event.sg_event_id})`)
      })
      
      if (fakeEvents.length > 5) {
        console.log(`   ... and ${fakeEvents.length - 5} more`)
      }
      
      // Delete fake events
      const { error: deleteError } = await supabase
        .from('sendgrid_events')
        .delete()
        .or('email.like.%example.com%,email.like.%demo%,email.like.%test%,sg_event_id.like.%demo%,sg_event_id.like.%fix%')
      
      if (deleteError) {
        console.error('❌ Error deleting fake events:', deleteError)
        return
      }
      
      console.log(`✅ Deleted ${fakeEvents.length} fake events`)
    } else {
      console.log('✅ No fake events found')
    }
    
    // 3. Check remaining real events
    const { data: realEvents, error: realError } = await supabase
      .from('sendgrid_events')
      .select('event_type', { count: 'exact' })
      .not('email', 'like', '%example.com%')
      .not('email', 'like', '%demo%')
      .not('email', 'like', '%test%')
    
    if (realError) {
      console.error('❌ Error counting real events:', realError)
      return
    }
    
    console.log(`\n📊 Remaining real events: ${realEvents?.length || 0}`)
    
    if (realEvents && realEvents.length > 0) {
      // Group by event type
      const eventTypeCounts = realEvents.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1
        return acc
      }, {})
      
      console.log('📈 Real event breakdown:')
      Object.entries(eventTypeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`)
      })
    } else {
      console.log('⚠️ No real email events found')
      console.log('💡 This means your dashboard will correctly show "No Email Performance Data"')
    }
    
    console.log('\n✅ Fake analytics data cleanup completed!')
    console.log('\n🔄 Refresh your dashboard to see real data only.')
    
  } catch (error) {
    console.error('❌ Error clearing fake analytics:', error)
  }
}

clearFakeAnalytics().catch(console.error)