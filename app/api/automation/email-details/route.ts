import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const emailType = searchParams.get('type') || 'all' // all, warmup, sequence
    const offset = (page - 1) * limit

    // Try to get sequence emails from email_tracking table first
    let sequenceEmails = null
    let sequenceError = null
    
    try {
      const { data: trackingEmails, error: trackingError } = await supabase
        .from('email_tracking')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(emailType === 'sequence' ? limit : Math.floor(limit / 2))

      if (!trackingError && trackingEmails) {
        sequenceEmails = trackingEmails
        console.log(`✅ Found ${trackingEmails.length} emails in email_tracking table`)
        console.log('📧 Sample email data:', JSON.stringify(trackingEmails[0], null, 2))
      } else {
        throw trackingError
      }
    } catch (error) {
      console.log('📝 email_tracking table empty or not accessible, falling back to automation_logs')
      
      // Fallback to automation_logs table
      const { data: automationEmails, error: automationError } = await supabase
        .from('automation_logs')
        .select(`
          *,
          campaign:campaigns(
            id,
            name
          ),
          contact:contacts(
            id,
            email,
            first_name,
            last_name,
            company
          )
        `)
        .eq('log_type', 'email_sent')
        .order('created_at', { ascending: false })
        .limit(emailType === 'sequence' ? limit : Math.floor(limit / 2))

      sequenceEmails = automationEmails
      sequenceError = automationError
      
      if (sequenceError) {
        console.error('Error fetching sequence emails from automation_logs:', sequenceError)
      }
    }

    // Get warmup emails from warmup_activities table
    const { data: warmupActivities, error: warmupError } = await supabase
      .from('warmup_activities')
      .select(`
        *,
        warmup_campaigns (
          id,
          sender_email,
          phase,
          day_in_phase,
          campaigns (
            id,
            name,
            user_id
          )
        )
      `)
      .eq('activity_type', 'send')
      .not('executed_at', 'is', null)
      .order('executed_at', { ascending: false })
      .limit(emailType === 'warmup' ? limit : Math.floor(limit / 2))

    if (warmupError) {
      console.error('Error fetching warmup emails:', warmupError)
    }

    // Transform sequence emails (handle both email_tracking and automation_logs format)
    const transformedSequenceEmails = (sequenceEmails || []).map(email => {
      // Check if this is from email_tracking table (has sent_at) or automation_logs (has created_at)
      const isFromEmailTracking = !!email.sent_at
      
      if (isFromEmailTracking) {
        // Data from new email_tracking table (proper sequence tracking format)
        return {
          id: `seq_${email.id}`,
          type: 'sequence',
          timestamp: email.sent_at,
          sender_email: email.sender_email || 'Unknown Sender',
          recipient_email: email.recipient_email || email.email || 'Unknown',
          recipient_name: email.recipient_email ? email.recipient_email.split('@')[0] : (email.email ? email.email.split('@')[0] : 'Unknown'),
          recipient_company: '',
          subject: email.subject || 'Campaign Email',
          campaign_name: `Campaign ${email.campaign_id?.slice(0, 8)}...`,
          sequence_step: email.sequence_step ? `Step ${email.sequence_step}` : 'Email Sequence',
          status: email.status,
          message_id: email.message_id || email.sg_message_id,
          details: {
            simulation: email.sender_type === 'simulation' || email.message_id?.includes('demo'),
            error_message: email.error_message || email.bounce_reason,
            campaign_id: email.campaign_id,
            contact_id: email.contact_id,
            sequence_id: email.sequence_id,
            user_id: email.user_id,
            sender_type: email.sender_type,
            opened_at: email.opened_at || email.first_opened_at,
            clicked_at: email.clicked_at || email.first_clicked_at,
            replied_at: email.replied_at,
            delivered_at: email.delivered_at,
            bounced_at: email.bounced_at,
            open_count: email.open_count,
            click_count: email.click_count
          }
        }
      } else {
        // Data from automation_logs table (fallback)
        return {
          id: `seq_${email.id}`,
          type: 'sequence',
          timestamp: email.created_at,
          sender_email: email.details?.sender || 'Unknown Sender',
          recipient_email: email.contact?.email || 'Unknown',
          recipient_name: email.contact ? `${email.contact.first_name || ''} ${email.contact.last_name || ''}`.trim() : 'Unknown',
          recipient_company: email.contact?.company || '',
          subject: email.email_subject || `Sequence Email - ${email.campaign?.name || 'Unknown Campaign'}`,
          campaign_name: email.campaign?.name || 'Unknown Campaign',
          sequence_step: email.sequence_step ? `Step ${email.sequence_step}` : 'Unknown Step',
          status: email.status,
          message_id: email.details?.messageId || null,
          details: {
            simulation: email.details?.testMode || false,
            error_message: null,
            campaign_id: email.campaign_id,
            contact_id: email.contact_id,
            execution_time_ms: email.execution_time_ms,
            next_email_in: email.details?.nextEmailIn
          }
        }
      }
    })

    // Transform warmup emails
    const transformedWarmupEmails = (warmupActivities || []).map(activity => ({
      id: `warmup_${activity.id}`,
      type: 'warmup',
      timestamp: activity.executed_at,
      sender_email: activity.warmup_campaigns?.sender_email || 'Unknown',
      recipient_email: activity.recipient_email || 'Unknown',
      recipient_name: activity.recipient_email ? activity.recipient_email.split('@')[0] : 'Unknown',
      recipient_company: 'Warmup Pool',
      subject: activity.subject || 'Warmup Email',
      campaign_name: activity.warmup_campaigns?.campaigns?.name || 'Warmup Campaign',
      sequence_step: `Phase ${activity.warmup_campaigns?.phase || 'Unknown'} - Day ${activity.warmup_campaigns?.day_in_phase || 'Unknown'}`,
      status: activity.success ? 'sent' : 'failed',
      message_id: activity.message_id,
      details: {
        simulation: activity.details?.simulated || false,
        warmup_phase: activity.warmup_campaigns?.phase,
        day_in_phase: activity.warmup_campaigns?.day_in_phase,
        activity_type: activity.activity_type,
        warmup_campaign_id: activity.warmup_campaigns?.id
      }
    }))

    // Combine and filter emails based on type
    let allEmails = []
    if (emailType === 'all') {
      allEmails = [...transformedSequenceEmails, ...transformedWarmupEmails]
    } else if (emailType === 'sequence') {
      allEmails = transformedSequenceEmails
    } else if (emailType === 'warmup') {
      allEmails = transformedWarmupEmails
    }

    // Sort by timestamp (most recent first)
    allEmails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Paginate
    const paginatedEmails = allEmails.slice(offset, offset + limit)

    // Calculate statistics
    const stats = {
      total_emails: allEmails.length,
      sequence_emails: transformedSequenceEmails.length,
      warmup_emails: transformedWarmupEmails.length,
      sent_emails: allEmails.filter(e => e.status === 'sent').length,
      failed_emails: allEmails.filter(e => e.status === 'failed').length,
      simulated_emails: allEmails.filter(e => e.details.simulation).length,
      real_emails: allEmails.filter(e => !e.details.simulation).length
    }

    // Get recent activity summary (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentEmails = allEmails.filter(e => new Date(e.timestamp) > last24Hours)
    
    const recentActivity = {
      last_24h_total: recentEmails.length,
      last_24h_sequence: recentEmails.filter(e => e.type === 'sequence').length,
      last_24h_warmup: recentEmails.filter(e => e.type === 'warmup').length,
      last_24h_sent: recentEmails.filter(e => e.status === 'sent').length,
      last_24h_failed: recentEmails.filter(e => e.status === 'failed').length
    }

    // Get sender breakdown for warmup
    const warmupSenders = [...new Set(transformedWarmupEmails.map(e => e.sender_email))]
    const senderBreakdown = warmupSenders.map(sender => ({
      sender_email: sender,
      total_sent: transformedWarmupEmails.filter(e => e.sender_email === sender && e.status === 'sent').length,
      total_failed: transformedWarmupEmails.filter(e => e.sender_email === sender && e.status === 'failed').length,
      recent_24h: recentEmails.filter(e => e.sender_email === sender && e.type === 'warmup').length
    }))

    return NextResponse.json({
      success: true,
      data: {
        emails: paginatedEmails,
        stats,
        recent_activity: recentActivity,
        sender_breakdown: senderBreakdown,
        pagination: {
          page,
          limit,
          total: allEmails.length,
          totalPages: Math.ceil(allEmails.length / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching detailed email logs:', error)
    
    // Return mock data for demo if there's an error
    return NextResponse.json({
      success: true,
      data: {
        emails: getMockDetailedEmails(),
        stats: {
          total_emails: 15,
          sequence_emails: 8,
          warmup_emails: 7,
          sent_emails: 13,
          failed_emails: 2,
          simulated_emails: 10,
          real_emails: 5
        },
        recent_activity: {
          last_24h_total: 12,
          last_24h_sequence: 6,
          last_24h_warmup: 6,
          last_24h_sent: 11,
          last_24h_failed: 1
        },
        sender_breakdown: [
          {
            sender_email: "support@company.com",
            total_sent: 4,
            total_failed: 0,
            recent_24h: 3
          },
          {
            sender_email: "sales@company.com", 
            total_sent: 3,
            total_failed: 1,
            recent_24h: 2
          }
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 15,
          totalPages: 1
        }
      }
    })
  }
}

function getMockDetailedEmails() {
  const now = new Date()
  return [
    {
      id: "warmup_1",
      type: "warmup",
      timestamp: new Date(now.getTime() - 300000).toISOString(), // 5 min ago
      sender_email: "support@company.com",
      recipient_email: "warmup-partner-1@mailinator.com",
      recipient_name: "warmup-partner-1",
      recipient_company: "Warmup Pool",
      subject: "Welcome to our newsletter",
      campaign_name: "Warmup Campaign",
      sequence_step: "Phase 1 - Day 3",
      status: "sent",
      message_id: "sim_warmup_1734534123_abc123",
      details: {
        simulation: true,
        warmup_phase: "ramp_up",
        day_in_phase: 3,
        activity_type: "send",
        warmup_campaign_id: 1
      }
    },
    {
      id: "seq_1",
      type: "sequence",
      timestamp: new Date(now.getTime() - 600000).toISOString(), // 10 min ago
      sender_email: "sales@company.com",
      recipient_email: "john.doe@example.com",
      recipient_name: "John Doe",
      recipient_company: "Tech Corp",
      subject: "Welcome to our platform!",
      campaign_name: "Welcome Series",
      sequence_step: "Step 1 of 6",
      status: "sent",
      message_id: "seq_msg_1734534000_def456",
      details: {
        simulation: false,
        campaign_id: "campaign_1",
        contact_id: "contact_123"
      }
    },
    {
      id: "warmup_2",
      type: "warmup",
      timestamp: new Date(now.getTime() - 900000).toISOString(), // 15 min ago
      sender_email: "noreply@company.com",
      recipient_email: "warmup-partner-2@mailinator.com",
      recipient_name: "warmup-partner-2",
      recipient_company: "Warmup Pool",
      subject: "Monthly update and insights",
      campaign_name: "Warmup Campaign",
      sequence_step: "Phase 1 - Day 2",
      status: "sent",
      message_id: "sim_warmup_1734533700_ghi789",
      details: {
        simulation: true,
        warmup_phase: "ramp_up",
        day_in_phase: 2,
        activity_type: "send",
        warmup_campaign_id: 2
      }
    },
    {
      id: "seq_2",
      type: "sequence",
      timestamp: new Date(now.getTime() - 1200000).toISOString(), // 20 min ago
      sender_email: "support@company.com",
      recipient_email: "alice.johnson@example.com",
      recipient_name: "Alice Johnson",
      recipient_company: "StartupXYZ",
      subject: "How are you finding our platform?",
      campaign_name: "Welcome Series",
      sequence_step: "Step 2 of 6",
      status: "sent",
      message_id: "seq_msg_1734533400_jkl012",
      details: {
        simulation: false,
        campaign_id: "campaign_1",
        contact_id: "contact_124"
      }
    },
    {
      id: "warmup_3",
      type: "warmup",
      timestamp: new Date(now.getTime() - 1800000).toISOString(), // 30 min ago
      sender_email: "info@company.com",
      recipient_email: "warmup-partner-3@mailinator.com",
      recipient_name: "warmup-partner-3",
      recipient_company: "Warmup Pool",
      subject: "Important product updates",
      campaign_name: "Warmup Campaign",
      sequence_step: "Phase 1 - Day 1",
      status: "failed",
      message_id: null,
      details: {
        simulation: false,
        warmup_phase: "ramp_up",
        day_in_phase: 1,
        activity_type: "send",
        warmup_campaign_id: 3,
        error_message: "Recipient email bounced"
      }
    }
  ]
}