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

    // Build query
    let query = supabase
      .from('inbox_emails')
      .select('*')
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
          sender: "customerservice@colesgroup.com.au",
          subject: "Quiet customers? I've got something.",
          preview: "Stop sending anti Ombudsman Brookes Mobile: 0410 151...",
          date: new Date().toISOString(),
          is_read: false,
          has_attachment: false,
          is_important: false,
          is_out_of_office: true,
          status: "lead",
          is_primary: true,
          to_email: "contact@leadsupbase.com",
          content: "Thank you for contacting us. This is a sample email content.",
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          sender: "shannon.latty@carat.com",
          subject: "Re: Automatic reply: Ads ON THE MOVE -",
          preview: "Hi Shannon, Thank you for engaging with us in 2024. We hop...",
          date: new Date().toISOString(),
          is_read: true,
          has_attachment: false,
          is_important: false,
          status_label: "Stratus x Uboard",
          status: "interested",
          is_primary: true,
          to_email: "contact@leadsupbase.com",
          content: "Hi Shannon, Thank you for engaging with us in 2024. We hope to continue our partnership.",
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          sender: "genevieve.marshall@scbcity.n...",
          subject: "RE: Ads ON THE MOVE - City of Canterbury Bankstown x Uboard",
          preview: "Hi Genevieve, Thank you for engaging with us in 2024. We h...",
          date: new Date().toISOString(),
          is_read: true,
          has_attachment: false,
          is_important: true,
          status: "meeting-booked",
          is_primary: true,
          to_email: "contact@leadsupdirect.co",
          content: "Hi Genevieve, Thank you for engaging with us in 2024. We have scheduled a meeting to discuss further.",
          created_at: new Date().toISOString()
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