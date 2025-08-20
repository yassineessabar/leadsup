// Debug script to check analytics data sources
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugAnalytics() {
  console.log('🔍 Debugging campaign analytics...')
  
  try {
    const userId = 'd155d4c2-2f06-45b7-9c90-905e3648e8df'
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    console.log('📊 Checking email_tracking table...')
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(5)
    
    if (trackingError) {
      console.error('❌ Error with email_tracking:', trackingError)
    } else {
      console.log(`📧 Found ${emailTracking?.length || 0} email tracking records`)
      if (emailTracking && emailTracking.length > 0) {
        console.log('📝 Sample tracking record:', {
          id: emailTracking[0].id,
          campaign_id: emailTracking[0].campaign_id,
          contact_id: emailTracking[0].contact_id,
          status: emailTracking[0].status,
          sent_at: emailTracking[0].sent_at,
          sender_email: emailTracking[0].sender_email,
          columns: Object.keys(emailTracking[0])
        })
      }
    }
    
    console.log('\n📊 Checking campaign_metrics table...')
    const { data: campaignMetrics, error: metricsError } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(5)
    
    if (metricsError) {
      console.error('❌ Error with campaign_metrics:', metricsError)
    } else {
      console.log(`📊 Found ${campaignMetrics?.length || 0} campaign metrics records`)
      if (campaignMetrics && campaignMetrics.length > 0) {
        console.log('📝 Sample metrics record:', campaignMetrics[0])
      }
    }
    
    console.log('\n📊 Checking user_metrics table...')
    const { data: userMetrics, error: userError } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .limit(5)
    
    if (userError) {
      console.error('❌ Error with user_metrics:', userError)
    } else {
      console.log(`👤 Found ${userMetrics?.length || 0} user metrics records`)
      if (userMetrics && userMetrics.length > 0) {
        console.log('📝 Sample user metrics record:', userMetrics[0])
      }
    }
    
    console.log('\n🔧 Testing database functions...')
    
    console.log('Testing get_sendgrid_campaign_metrics...')
    const { data: funcResult, error: funcError } = await supabase.rpc('get_sendgrid_campaign_metrics', {
      p_campaign_id: campaignId,
      p_user_id: userId,
      p_start_date: null,
      p_end_date: null
    })
    
    if (funcError) {
      console.error('❌ Database function error:', funcError)
    } else {
      console.log('✅ Function result:', funcResult)
    }
    
    // Let's also check sendgrid_events table
    console.log('\n📧 Checking sendgrid_events table...')
    const { data: events, error: eventsError } = await supabase
      .from('sendgrid_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(5)
    
    if (eventsError) {
      console.error('❌ Error with sendgrid_events:', eventsError)
    } else {
      console.log(`📨 Found ${events?.length || 0} SendGrid events`)
      if (events && events.length > 0) {
        console.log('📝 Sample event:', events[0])
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugAnalytics()