import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const accountEmail = searchParams.get('account')
    const searchQuery = searchParams.get('search')
    const tab = searchParams.get('tab') || 'primary'
    const campaignId = searchParams.get('campaign_id')
    const folder = searchParams.get('folder')
    const channel = searchParams.get('channel')
    const startDate = searchParams.get('start_date')

    // Build query with campaign information
    let query = supabase
      .from('inbox_emails')
      .select(`
        *,
        campaigns!inner(id, name, type, status)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (accountEmail) {
      query = query.eq('to_email', accountEmail)
    }

    if (searchQuery) {
      query = query.or(`subject.ilike.%${searchQuery}%,sender.ilike.%${searchQuery}%,preview.ilike.%${searchQuery}%`)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (folder) {
      query = query.eq('folder', folder)
    } else {
      query = query.eq('folder', 'inbox') // Default to inbox folder
    }

    if (channel) {
      query = query.eq('channel', channel)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (tab === 'primary') {
      query = query.eq('is_primary', true)
    } else if (tab === 'others') {
      query = query.eq('is_primary', false)
    }

    const { data: emails, error } = await query

    if (error) {
      console.error('Error fetching inbox emails:', error)
      // If table doesn't exist, return sample data
      if (error.code === 'PGRST205' || error.message?.includes('inbox_emails')) {
        const sampleEmails = [
        {
          id: 1,
          sender: "john.doe@example.com",
          subject: "Re: Your proposal looks interesting",
          preview: "Thanks for reaching out. I would love to schedule a call...",
          date: new Date().toISOString(),
          is_read: false,
          has_attachment: false,
          is_important: false,
          is_out_of_office: false,
          status: "interested",
          is_primary: true,
          to_email: "contact@leadsupbase.com",
          content: "Hi there,\n\nThanks for reaching out with your proposal. It looks very interesting and I would love to learn more.\n\nCould we schedule a 15-minute call sometime this week?\n\nBest regards,\nJohn Doe",
          created_at: new Date().toISOString(),
          campaign_id: 1,
          campaign_name: "Welcome Series",
          sequence_step: 2,
          folder: "inbox",
          channel: "email"
        },
        {
          id: 2,
          sender: "sarah.wilson@company.com",
          subject: "Meeting scheduled for next week",
          preview: "Perfect! I have added the meeting to my calendar...",
          date: new Date().toISOString(),
          is_read: true,
          has_attachment: false,
          is_important: false,
          status_label: "Follow-up Campaign",
          status: "meeting-booked",
          is_primary: true,
          to_email: "contact@leadsupbase.com",
          content: "Perfect!\n\nI have added the meeting to my calendar for Tuesday at 2 PM. Looking forward to discussing how we can work together.\n\nBest,\nSarah Wilson",
          created_at: new Date().toISOString(),
          campaign_id: 2,
          campaign_name: "Follow-up Campaign",
          sequence_step: 3,
          folder: "inbox",
          channel: "email"
        },
        {
          id: 3,
          sender: "mike.brown@business.co",
          subject: "Follow-up on our conversation", 
          preview: "Hi, following up on our call yesterday. The pricing looks good...",
          date: new Date().toISOString(),
          is_read: false,
          has_attachment: false,
          is_important: true,
          status: "meeting-completed",
          is_primary: true,
          to_email: "contact@leadsupbase.com",
          content: "Hi,\n\nFollowing up on our call yesterday. The pricing looks good and the timeline works for us.\n\nLet me check with my team and I will get back to you by Friday.\n\nThanks!\nMike Brown",
          created_at: new Date().toISOString(),
          campaign_id: 1,
          campaign_name: "Welcome Series",
          sequence_step: 4,
          folder: "inbox",
          channel: "email"
        },
        {
          id: 4,
          sender: "peekaboo@longdaycare.co...",
          subject: "Your email requires verification",
          preview: "verify#o9MVBrQbHo7X8S20qzAM-1725842186 The message you sent requires that you verify that you are a...",
          date: "Sep 9, 2024",
          is_read: true,
          has_attachment: false,
          is_important: false,
          status: "meeting-completed",
          is_primary: true,
          to_email: "contact@leadsuprech.co",
          content: "The message you sent requires that you verify that you are a real person. Please click the verification link.",
          created_at: new Date().toISOString()
        },
        {
          id: 5,
          sender: "peacock@longdaycare.com...",
          subject: "Your email requires verification",
          preview: "verify#tZAZUpsP6vtGthaQKAEVD-1725841484) The message you sent requires that you verify that you are...",
          date: "Sep 9, 2024",
          is_read: true,
          has_attachment: false,
          is_important: false,
          status: "won",
          is_primary: false,
          to_email: "contact@leadsuprech.com",
          content: "The message you sent requires that you verify that you are a real person. Please click the verification link.",
          created_at: new Date().toISOString()
        }
      ]
      
      // Filter based on params if provided
      let filteredEmails = sampleEmails
      
      if (status) {
        filteredEmails = filteredEmails.filter(e => e.status === status)
      }
      
      if (tab === 'primary') {
        filteredEmails = filteredEmails.filter(e => e.is_primary === true)
      } else if (tab === 'others') {
        filteredEmails = filteredEmails.filter(e => e.is_primary === false)
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filteredEmails = filteredEmails.filter(e => 
          e.subject.toLowerCase().includes(query) ||
          e.sender.toLowerCase().includes(query) ||
          e.preview.toLowerCase().includes(query)
        )
      }
      
        return NextResponse.json({ emails: filteredEmails })
      }
      
      // If other error, return it
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    // If no emails exist, return empty array
    if (!emails || emails.length === 0) {
      return NextResponse.json({ emails: [] })
    }

    return NextResponse.json({ emails })
  } catch (error) {
    console.error('Error in inbox GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sender, subject, preview, content, status, to_email } = body

    const { data, error } = await supabase
      .from('inbox_emails')
      .insert({
        sender,
        subject,
        preview: preview || content.substring(0, 100) + '...',
        content,
        status: status || 'lead',
        to_email,
        is_read: false,
        has_attachment: false,
        is_important: false,
        is_out_of_office: false,
        is_primary: true,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating email:', error)
      return NextResponse.json({ error: 'Failed to create email' }, { status: 500 })
    }

    return NextResponse.json({ email: data })
  } catch (error) {
    console.error('Error in inbox POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}