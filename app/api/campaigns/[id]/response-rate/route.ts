import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase'

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
    
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Response rate API called with campaignId:', params.id)
    
    const userId = await getUserIdFromSession()
    console.log('👤 User ID from session:', userId)

    if (!userId) {
      console.log('❌ Not authenticated')
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const campaignId = params.id
    console.log('📊 Starting response rate calculation for campaign:', campaignId)

    // Get actual inbound messages for debugging
    const { data: inboundMessages, count: inboundCount } = await supabaseServer
      .from('inbox_messages')
      .select('id, subject, contact_email, direction, sent_at, received_at, created_at')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .eq('direction', 'inbound')
      .neq('folder', 'trash')

    // Get total emails sent from SendGrid for this campaign (real email count)
    const { data: sendgridEvents, count: totalEmailsSent } = await supabaseServer
      .from('sendgrid_events')
      .select('sg_message_id')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .in('event_type', ['processed', 'delivered'])

    // Debug: Check what's actually in inbox_messages
    const { data: allUserMessages, count: anyInboxMessages } = await supabaseServer
      .from('inbox_messages')
      .select('id, campaign_id, direction, contact_email, subject')
      .eq('user_id', userId)
      .limit(10)

    const { data: campaignMessages, count: totalInboxMessages } = await supabaseServer
      .from('inbox_messages')
      .select('id, campaign_id, direction, contact_email, subject')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .limit(10)

    // Calculate response rate as: inbound messages / total emails sent from SendGrid
    const uniqueEmailsSent = sendgridEvents ? [...new Set(sendgridEvents.map(e => e.sg_message_id))].length : 0
    const responseRate = uniqueEmailsSent > 0 ? 
      Math.round(((inboundCount || 0) / uniqueEmailsSent) * 100 * 10) / 10 : 0

    console.log(`🔍 Inbox debugging for campaign ${campaignId}:`, {
      campaignId,
      userId,
      totalInboxMessagesForUser: anyInboxMessages || 0,
      totalInboxMessagesForCampaign: totalInboxMessages || 0,
      inboundForCampaign: inboundCount || 0,
      sendgridEmailsSent: uniqueEmailsSent,
      responseRate,
      allUserMessages: allUserMessages?.map(m => ({ 
        id: m.id,
        campaign_id: m.campaign_id,
        direction: m.direction,
        subject: m.subject 
      })),
      campaignMessages: campaignMessages?.map(m => ({ 
        id: m.id,
        campaign_id: m.campaign_id,
        direction: m.direction,
        subject: m.subject 
      }))
    })

    // If no inbox messages exist, this suggests inbox integration isn't working
    if ((anyInboxMessages || 0) === 0) {
      console.log('⚠️ No inbox_messages found for user - inbox integration may not be working')
    } else if ((totalInboxMessages || 0) === 0) {
      console.log('⚠️ No inbox_messages found for this campaign - emails may not be tagged with campaign_id')
    }

    return NextResponse.json({
      success: true,
      data: {
        inboundCount: inboundCount || 0,
        totalEmailsSent: uniqueEmailsSent,
        responseRate
      },
      debug: {
        campaignId,
        userId,
        totalInboxMessagesForUser: anyInboxMessages || 0,
        totalInboxMessagesForCampaign: totalInboxMessages || 0,
        allUserMessages: allUserMessages?.map(m => ({ 
          id: m.id,
          campaign_id: m.campaign_id,
          direction: m.direction,
          subject: m.subject 
        })) || [],
        campaignMessages: campaignMessages || []
      }
    })

  } catch (error) {
    console.error('❌ Error fetching response rate:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}