import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('warmup_recipients')
      .select('*')
    
    // Check warming campaigns
    const { data: warmingCampaigns, error: campaignsError } = await supabase
      .from('warmup_campaigns')
      .select('*')
    
    // Check warming activities
    const { data: activities, error: activitiesError } = await supabase
      .from('warmup_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Check templates
    const { data: templates, error: templatesError } = await supabase
      .from('warmup_templates')
      .select('*')

    // Simulate the recipient filtering logic
    const activeWarmingCampaigns = warmingCampaigns?.filter(w => w.status === 'active') || []
    let recipientFilterTest = {}
    
    if (activeWarmingCampaigns.length > 0) {
      const testWarmup = activeWarmingCampaigns[0]
      const emailsNeeded = testWarmup.daily_target - testWarmup.emails_sent_today
      
      // Filter recipients exactly like the scheduler does
      const availableRecipients = recipients?.filter(r => 
        r.is_active === true && (r.emails_received_today || 0) < (r.max_daily_emails || 10)
      ) || []
      
      recipientFilterTest = {
        testWarmup: {
          sender_email: testWarmup.sender_email,
          daily_target: testWarmup.daily_target,
          emails_sent_today: testWarmup.emails_sent_today,
          emails_needed: emailsNeeded
        },
        filtering: {
          total_recipients: recipients?.length || 0,
          active_recipients: recipients?.filter(r => r.is_active === true).length || 0,
          within_daily_limit: recipients?.filter(r => (r.emails_received_today || 0) < (r.max_daily_emails || 10)).length || 0,
          final_available: availableRecipients.length
        },
        first_few_recipients: availableRecipients.slice(0, 3).map(r => ({
          email: r.email,
          is_active: r.is_active,
          emails_received_today: r.emails_received_today,
          max_daily_emails: r.max_daily_emails
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        recipients: {
          count: recipients?.length || 0,
          error: recipientsError
        },
        warmingCampaigns: {
          count: warmingCampaigns?.length || 0,
          active_count: activeWarmingCampaigns.length,
          error: campaignsError
        },
        templates: {
          count: templates?.length || 0,
          error: templatesError
        },
        activities: {
          count: activities?.length || 0,
          recent: activities?.slice(0, 5),
          error: activitiesError
        },
        recipientFilterTest
      }
    })

  } catch (error) {
    console.error('Error in warming debug:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch debug info'
    }, { status: 500 })
  }
}