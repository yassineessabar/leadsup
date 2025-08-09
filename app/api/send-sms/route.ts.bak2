import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import twilio from "twilio"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const requestData = await request.json()
    const { contacts } = requestData

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No contacts provided"
      }, { status: 400 })
    }

    // Fetch the latest SMS template from database
    const { data: smsTemplate, error: templateError } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (templateError || !smsTemplate) {
      return NextResponse.json({
        success: false,
        error: "SMS template not found. Please configure your SMS template first."
      }, { status: 404 })
    }

    // Use the latest content and sender name from database
    const content = smsTemplate.content
    const sms_sender_name = smsTemplate.sender_name

    if (!content) {
      return NextResponse.json({
        success: false,
        error: "SMS template content is empty. Please configure your SMS template."
      }, { status: 400 })
    }

    // Validate Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json({
        success: false,
        error: "Twilio configuration is missing. Please check environment variables."
      }, { status: 500 })
    }

    // Initialize Twilio client
    let client
    try {
      client = twilio(accountSid, authToken)
    } catch (error: any) {
      console.error("Error initializing Twilio client:", error)
      return NextResponse.json({
        success: false,
        error: `Twilio client initialization failed: ${error.message}`
      }, { status: 500 })
    }

    // Get the user's review_link_id
    const { data: reviewLink, error: reviewLinkError } = await supabase
      .from("review_link")
      .select("id, review_url")
      .eq("user_id", userId)
      .single()

    if (reviewLinkError || !reviewLink) {
      return NextResponse.json({
        success: false,
        error: "Review link not found. Please set up your review link first."
      }, { status: 404 })
    }

    // Filter valid contacts (must have name and phone number)
    const validContacts = contacts.filter(contact =>
      contact.name && contact.number && contact.number.trim()
    )

    if (validContacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid contacts with phone numbers found"
      }, { status: 400 })
    }

    const results = []
    const errors = []

    // Send SMS to each contact
    for (const contact of validContacts) {
      try {
        // Create trackable review URL with customer ID
        const trackableReviewUrl = `${reviewLink.review_url}?cid=${contact.id || 'sms-' + Date.now()}`

        // Replace placeholders in the message (support both {{variable}} and [variable] formats)
        let personalizedMessage = content
          .replace(/\{\{customerName\}\}/g, contact.name)
          .replace(/\{\{companyName\}\}/g, sms_sender_name || 'Your Business')
          .replace(/\{\{reviewUrl\}\}/g, trackableReviewUrl)
          .replace(/\[Name\]/g, contact.name)
          .replace(/\[Company\]/g, sms_sender_name || 'Your Business')
          .replace(/\[reviewUrl\]/g, trackableReviewUrl)

        // Send SMS via Twilio
        const message = await client.messages.create({
          body: personalizedMessage,
          from: twilioPhoneNumber,
          to: contact.number
        })

        // Save the request to database
        const { data: savedRequest, error: saveError } = await supabase
          .from("review_requests")
          .insert({
            user_id: userId,
            review_link_id: reviewLink.id,
            contact_name: contact.name,
            contact_phone: contact.number,
            contact_email: null,
            request_type: 'sms',
            content: personalizedMessage,
            subject_line: null,
            from_email: null,
            sms_sender_name: sms_sender_name,
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (saveError) {
          console.error("Error saving SMS request to database:", saveError)
        }

        results.push({
          contact: contact.name,
          phone: contact.number,
          status: 'sent',
          twilioSid: message.sid,
          savedRequest: savedRequest
        })

      } catch (error: any) {
        console.error(`Error sending SMS to ${contact.name} (${contact.number}):`, error)
        errors.push({
          contact: contact.name,
          phone: contact.number,
          error: error.message || 'Failed to send SMS'
        })

        // Still save failed attempt to database
        try {
          await supabase
            .from("review_requests")
            .insert({
              user_id: userId,
              review_link_id: reviewLink.id,
              contact_name: contact.name,
              contact_phone: contact.number,
              contact_email: null,
              request_type: 'sms',
              content: content
                .replace(/\{\{customerName\}\}/g, contact.name)
                .replace(/\{\{companyName\}\}/g, sms_sender_name || 'Your Business')
                .replace(/\{\{reviewUrl\}\}/g, `${reviewLink.review_url}?cid=${contact.id || 'sms-' + Date.now()}`)
                .replace(/\[Name\]/g, contact.name)
                .replace(/\[Company\]/g, sms_sender_name || 'Your Business')
                .replace(/\[reviewUrl\]/g, `${reviewLink.review_url}?cid=${contact.id || 'sms-' + Date.now()}`),
              subject_line: null,
              from_email: null,
              sms_sender_name: sms_sender_name,
              status: 'failed',
              sent_at: new Date().toISOString(),
            })
        } catch (dbError) {
          console.error("Error saving failed SMS request:", dbError)
        }
      }
    }

    const response = {
      success: true,
      data: {
        total_contacts: validContacts.length,
        successful_sends: results.length,
        failed_sends: errors.length,
        results: results,
        errors: errors
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error in POST /api/send-sms:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}