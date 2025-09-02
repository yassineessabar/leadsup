import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "@/lib/supabase"
import { sendEmailWithSendGrid } from "@/lib/sendgrid"

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await getSupabaseServerClient()
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { from, to, subject, html } = await request.json()

    console.log('📧 SendGrid test email request:', {
      from,
      to,
      subject,
      htmlLength: html?.length || 0,
      htmlContent: html?.substring(0, 100) + (html?.length > 100 ? '...' : '')
    })

    if (!from || !to || !subject || !html) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: from, to, subject, html" },
        { status: 400 }
      )
    }

    // Verify the sender email belongs to user's campaign senders
    // First get user's campaigns, then check senders
    const { data: userCampaigns } = await getSupabaseServerClient()
      .from('campaigns')
      .select('id')
      .eq('user_id', userId)
    
    if (!userCampaigns || userCampaigns.length === 0) {
      return NextResponse.json(
        { success: false, error: "No campaigns found for user" },
        { status: 403 }
      )
    }
    
    const campaignIds = userCampaigns.map(c => c.id)
    
    const { data: campaignSender, error: senderError } = await getSupabaseServerClient()
      .from('campaign_senders')
      .select('email, name')
      .eq('email', from)
      .in('campaign_id', campaignIds)
      .eq('is_active', true)
      .single()

    if (senderError || !campaignSender) {
      return NextResponse.json(
        { success: false, error: "Sender email not found or not authorized" },
        { status: 403 }
      )
    }

    // Ensure HTML content is not empty as a final safeguard
    const emailHtml = html && html.trim() ? html : '<h2>Test Email</h2><p>This is a test email from LeadsUp.</p>'
    
    console.log('📧 Final email content before SendGrid:', {
      htmlLength: emailHtml.length,
      htmlContent: emailHtml.substring(0, 100) + '...'
    })

    // Send via SendGrid using the existing library function
    await sendEmailWithSendGrid({
      to: to,
      from: from,
      fromName: campaignSender.name || from.split('@')[0],
      subject: subject,
      html: emailHtml
    })

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully'
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    
    let errorMessage = error.message || 'Internal server error'
    if (errorMessage.includes('SENDGRID_API_KEY')) {
      errorMessage = 'SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.'
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}