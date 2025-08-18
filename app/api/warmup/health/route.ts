import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🏥 Health check started:', new Date().toISOString())
    
    // Check database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('warmup_campaigns')
      .select('id')
      .limit(1)
    
    if (dbError) {
      console.error('❌ Database connection failed:', dbError)
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Database connection failed',
        details: dbError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Check active warmup campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('warmup_campaigns')
      .select('id, sender_email, emails_sent_today, daily_target, status, phase')
      .eq('status', 'active')
    
    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError)
      return NextResponse.json({
        status: 'unhealthy',
        error: 'Failed to fetch campaigns',
        details: campaignsError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Check recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { data: recentActivity, error: activityError } = await supabase
      .from('warmup_activities')
      .select('id, activity_type, success, executed_at')
      .gte('executed_at', yesterday.toISOString())
      .order('executed_at', { ascending: false })
      .limit(10)
    
    if (activityError) {
      console.error('❌ Error fetching recent activity:', activityError)
    }
    
    // Check recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('warmup_recipients')
      .select('email, is_active')
      .eq('is_active', true)
    
    if (recipientsError) {
      console.error('❌ Error fetching recipients:', recipientsError)
    }
    
    // Check pending activities
    const { data: pendingActivities, error: pendingError } = await supabase
      .from('warmup_activities')
      .select('id, activity_type, scheduled_for')
      .is('executed_at', null)
      .order('scheduled_for', { ascending: true })
      .limit(5)
    
    if (pendingError) {
      console.error('❌ Error fetching pending activities:', pendingError)
    }
    
    // Environment check
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      simulationMode: process.env.EMAIL_SIMULATION_MODE !== 'false'
    }
    
    const recentSuccessful = recentActivity?.filter(a => a.success) || []
    const recentFailed = recentActivity?.filter(a => !a.success) || []
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      campaigns: {
        total: campaigns?.length || 0,
        active: campaigns?.filter(c => c.status === 'active').length || 0,
        details: campaigns?.map(c => ({
          sender: c.sender_email,
          phase: c.phase,
          progress: `${c.emails_sent_today}/${c.daily_target}`
        })) || []
      },
      recipients: {
        total: recipients?.length || 0,
        active: recipients?.filter(r => r.is_active).length || 0
      },
      recentActivity: {
        total: recentActivity?.length || 0,
        successful: recentSuccessful.length,
        failed: recentFailed.length,
        lastActivity: recentActivity?.[0]?.executed_at || null,
        recent: recentActivity?.slice(0, 5).map(a => ({
          type: a.activity_type,
          success: a.success,
          time: a.executed_at
        })) || []
      },
      pendingActivities: {
        total: pendingActivities?.length || 0,
        upcoming: pendingActivities?.map(p => ({
          type: p.activity_type,
          scheduledFor: p.scheduled_for
        })) || []
      }
    }
    
    console.log('✅ Health check completed successfully')
    console.log(`   Active campaigns: ${healthData.campaigns.active}`)
    console.log(`   Recent activities: ${healthData.recentActivity.total}`)
    console.log(`   Pending activities: ${healthData.pendingActivities.total}`)
    
    return NextResponse.json(healthData)
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasSendGridKey: !!process.env.SENDGRID_API_KEY,
        simulationMode: process.env.EMAIL_SIMULATION_MODE !== 'false'
      }
    }, { status: 500 })
  }
}