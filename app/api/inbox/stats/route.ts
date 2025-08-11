import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

// GET - Fetch inbox statistics and summary
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('range') || '30' // days
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))

    console.log('📊 Fetching inbox stats for user:', userId, 'range:', dateRange)

    // Parallel queries for better performance
    const [
      totalMessagesResult,
      unreadMessagesResult,
      todayMessagesResult,
      leadStatusStatsResult,
      campaignStatsResult,
      folderStatsResult,
      recentActivityResult
    ] = await Promise.all([
      // Total messages
      supabaseServer
        .from('inbox_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .gte('created_at', startDate.toISOString()),

      // Unread messages
      supabaseServer
        .from('inbox_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'unread')
        .neq('folder', 'trash'),

      // Today's messages
      supabaseServer
        .from('inbox_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .gte('created_at', new Date().toISOString().split('T')[0]),

      // Lead status breakdown
      supabaseServer
        .from('inbox_messages')
        .select('lead_status')
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .not('lead_status', 'is', null)
        .gte('created_at', startDate.toISOString()),

      // Campaign performance
      supabaseServer
        .from('inbox_messages')
        .select(`
          campaign_id,
          campaigns!inner(name)
        `)
        .eq('user_id', userId)
        .neq('status', 'deleted')
        .not('campaign_id', 'is', null)
        .gte('created_at', startDate.toISOString()),

      // Folder distribution (all messages)
      supabaseServer
        .from('inbox_messages')
        .select('folder')
        .eq('user_id', userId)
        .neq('status', 'deleted'),

      // Recent activity (last 10 actions)
      supabaseServer
        .from('inbox_actions')
        .select(`
          id,
          action_type,
          action_data,
          created_at,
          message:inbox_messages(subject, contact_name, contact_email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    // Process lead status stats
    const leadStatusCounts = {}
    leadStatusStatsResult.data?.forEach(message => {
      if (message.lead_status) {
        leadStatusCounts[message.lead_status] = (leadStatusCounts[message.lead_status] || 0) + 1
      }
    })

    // Process campaign stats
    const campaignCounts = {}
    campaignStatsResult.data?.forEach(message => {
      if (message.campaigns) {
        const campaignName = message.campaigns.name
        campaignCounts[campaignName] = (campaignCounts[campaignName] || 0) + 1
      }
    })

    // Process folder stats with defaults
    const folderCounts = {
      inbox: 0,
      sent: 0,
      trash: 0
    }
    
    // Get additional sent message count (outbound messages not already marked as sent)
    const { count: outboundCount } = await supabaseServer
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .neq('status', 'deleted')
      .neq('folder', 'sent') // Don't double count
    
    folderStatsResult.data?.forEach(message => {
      const folder = message.folder || 'inbox'
      folderCounts[folder] = (folderCounts[folder] || 0) + 1
    })
    
    // Add outbound messages to sent count
    folderCounts.sent += (outboundCount || 0)

    // Calculate response rate (replied messages vs total inbound)
    const { count: inboundCount } = await supabaseServer
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'inbound')
      .neq('status', 'deleted')
      .gte('created_at', startDate.toISOString())

    const { count: repliedCount } = await supabaseServer
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .neq('status', 'deleted')
      .not('in_reply_to', 'is', null)
      .gte('created_at', startDate.toISOString())

    const responseRate = inboundCount > 0 ? Math.round((repliedCount / inboundCount) * 100) : 0

    // Calculate average response time (mock for now - would need real implementation)
    const avgResponseTime = '2.5 hours' // This would be calculated from actual message timestamps

    const stats = {
      summary: {
        total_messages: totalMessagesResult.count || 0,
        unread_messages: unreadMessagesResult.count || 0,
        today_messages: todayMessagesResult.count || 0,
        response_rate: responseRate,
        avg_response_time: avgResponseTime
      },
      lead_status_breakdown: leadStatusCounts,
      campaign_performance: campaignCounts,
      folder_distribution: folderCounts,
      recent_activity: recentActivityResult.data?.map(activity => ({
        id: activity.id,
        action_type: activity.action_type,
        action_data: activity.action_data,
        created_at: activity.created_at,
        message_subject: activity.message?.subject,
        contact_name: activity.message?.contact_name,
        contact_email: activity.message?.contact_email
      })) || [],
      date_range: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days: parseInt(dateRange)
      }
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error("❌ Error fetching inbox stats:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}