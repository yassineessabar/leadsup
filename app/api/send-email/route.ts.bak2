import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import nodemailer from "nodemailer"

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

    // Fetch the latest Email template from database
    const { data: emailTemplate, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("user_id", userId)
      .single()

    // Use template from database or fall back to modern defaults
    const subject = emailTemplate?.subject || "How was your experience with [Company]?"
    const content = emailTemplate?.content || `Hi [Name],

We hope you enjoyed your experience with [Company]. Could you take 30 seconds to share your thoughts?

Your feedback helps us improve and lets others know what to expect.

Leave a review: [reviewUrl]

Thanks for your time,
The [Company] Team`
    const fromEmail = emailTemplate?.from_email || process.env.FROM_EMAIL || "hello@yourbusiness.com"

    // Validate SMTP configuration
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail) {
      return NextResponse.json({
        success: false,
        error: "Email configuration is missing. Please check environment variables and template settings."
      }, { status: 500 })
    }

    // Get the user's review_link_id
    const { data: reviewLink, error: reviewLinkError } = await supabase
      .from("review_link")
      .select("id, review_url, company_name")
      .eq("user_id", userId)
      .single()

    if (reviewLinkError || !reviewLink) {
      return NextResponse.json({
        success: false,
        error: "Review link not found. Please set up your review link first."
      }, { status: 404 })
    }

    // Filter valid contacts (must have name and email)
    const validContacts = contacts.filter(contact =>
      contact.name && contact.email && contact.email.trim()
    )

    if (validContacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid contacts with email addresses found"
      }, { status: 400 })
    }

    // Initialize nodemailer transporter
    let transporter
    try {
      transporter = nodemailer.createTransporter({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    } catch (error: any) {
      console.error("Error initializing SMTP transporter:", error)
      return NextResponse.json({
        success: false,
        error: `SMTP configuration failed: ${error.message}`
      }, { status: 500 })
    }

    const results = []
    const errors = []

    // Send Email to each contact
    for (const contact of validContacts) {
      try {
        // Create trackable review URL with customer ID
        const trackableReviewUrl = `${reviewLink.review_url}?cid=${contact.id || 'email-' + Date.now()}`

        // Replace placeholders in the subject and message (support both {{variable}} and [variable] formats)
        let personalizedSubject = subject
          .replace(/\{\{customerName\}\}/g, contact.name)
          .replace(/\{\{companyName\}\}/g, reviewLink.company_name || 'Your Business')
          .replace(/\[Name\]/g, contact.name)
          .replace(/\[Company\]/g, reviewLink.company_name || 'Your Business')

        let personalizedMessage = content
          .replace(/\{\{customerName\}\}/g, contact.name)
          .replace(/\{\{companyName\}\}/g, reviewLink.company_name || 'Your Business')
          .replace(/\{\{reviewUrl\}\}/g, trackableReviewUrl)
          .replace(/\[Name\]/g, contact.name)
          .replace(/\[Company\]/g, reviewLink.company_name || 'Your Business')
          .replace(/\[reviewUrl\]/g, trackableReviewUrl)

        // Create modern email template with gradient design
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${personalizedSubject}</title>
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; }
    .sparkle { animation: sparkle 2s ease-in-out infinite alternate; }
    @keyframes sparkle { 0% { opacity: 0.6; } 100% { opacity: 1; } }
    @media (max-width: 600px) {
      .container { width: 95% !important; margin: 10px auto !important; }
      .header-content { padding: 30px 20px !important; }
      .main-content { padding: 20px !important; }
      .header-title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div class="container" style="max-width: 650px; margin: 0 auto; background-color: white; font-family: 'Inter', sans-serif;">

    <!-- Main Content Section -->
    <div class="main-content" style="background-color: white; padding: 24px 24px 32px;">

      <!-- Spacer -->
      <div style="height: 48px;"></div>

      <!-- Customer Name -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 20px; font-weight: bold; color: #1f2937;">${contact.name}</h2>
      </div>

      <!-- Main Content Text -->
      <div style="text-align: center; margin-bottom: 32px; padding: 0 40px;">
        <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
          We hope you enjoyed your experience with <strong style="color: #8b5cf6;">${reviewLink.company_name || 'Your Business'}</strong>. Could you take 30 seconds to share your thoughts?
        </p>
        <p style="color: #374151; line-height: 1.6;">
          Your feedback helps us improve and lets others know what to expect.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${trackableReviewUrl}" target="_blank" style="display: inline-block; background: linear-gradient(to right, #a78bfa, #06b6d4); color: white; padding: 12px 32px; border-radius: 9999px; border: 2px solid white; font-weight: 600; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          LEAVE A REVIEW
        </a>
      </div>

      <!-- Thank You Message -->
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="color: #374151; margin-bottom: 8px;">Thanks for your time,</p>
        <p style="color: #1f2937; font-weight: 600;">The ${reviewLink.company_name || 'Your Business'} Team</p>
      </div>

      <!-- Spacer -->
      <div style="height: 32px;"></div>
    </div>

    <!-- Black Footer Section -->
    <div style="background-color: black; color: white; padding: 24px; text-align: center; font-size: 14px;">
      <div style="margin-bottom: 16px;">
        <p style="margin-bottom: 8px;">
          You're receiving this email because a business you interacted with uses Loop Review to collect feedback.
          To learn more, visit <a href="https://loopreview.io" style="color: #a78bfa; text-decoration: underline;">loopreview.io</a> or contact us at <a href="mailto:support@loopreview.io" style="color: #a78bfa; text-decoration: underline;">support@loopreview.io</a>.
        </p>
        <p>
          © ${new Date().getFullYear()} Loop Review. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
        `

        // Send Email via SMTP
        const mailOptions = {
          from: `"${reviewLink.company_name || 'Your Business'}" <${fromEmail}>`,
          to: contact.email,
          subject: personalizedSubject,
          text: personalizedMessage,
          html: htmlContent,
        }

        const emailResponse = await transporter.sendMail(mailOptions)

        // Save the request to database
        const { data: savedRequest, error: saveError } = await supabase
          .from("review_requests")
          .insert({
            user_id: userId,
            review_link_id: reviewLink.id,
            contact_name: contact.name,
            contact_phone: null,
            contact_email: contact.email,
            request_type: 'email',
            content: personalizedMessage,
            subject_line: personalizedSubject,
            from_email: fromEmail,
            sms_sender_name: null,
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (saveError) {
          console.error("Error saving Email request to database:", saveError)
        }

        results.push({
          contact: contact.name,
          email: contact.email,
          status: 'sent',
          messageId: emailResponse.messageId,
          savedRequest: savedRequest
        })

      } catch (error: any) {
        console.error(`Error sending Email to ${contact.name} (${contact.email}):`, error)
        errors.push({
          contact: contact.name,
          email: contact.email,
          error: error.message || 'Failed to send Email'
        })

        // Still save failed attempt to database
        try {
          await supabase
            .from("review_requests")
            .insert({
              user_id: userId,
              review_link_id: reviewLink.id,
              contact_name: contact.name,
              contact_phone: null,
              contact_email: contact.email,
              request_type: 'email',
              content: content
                .replace(/\{\{customerName\}\}/g, contact.name)
                .replace(/\{\{companyName\}\}/g, reviewLink.company_name || 'Your Business')
                .replace(/\{\{reviewUrl\}\}/g, `${reviewLink.review_url}?cid=${contact.id || 'email-' + Date.now()}`)
                .replace(/\[Name\]/g, contact.name)
                .replace(/\[Company\]/g, reviewLink.company_name || 'Your Business')
                .replace(/\[reviewUrl\]/g, `${reviewLink.review_url}?cid=${contact.id || 'email-' + Date.now()}`),
              subject_line: subject
                .replace(/\{\{customerName\}\}/g, contact.name)
                .replace(/\{\{companyName\}\}/g, reviewLink.company_name || 'Your Business')
                .replace(/\[Name\]/g, contact.name)
                .replace(/\[Company\]/g, reviewLink.company_name || 'Your Business'),
              from_email: fromEmail,
              sms_sender_name: null,
              status: 'failed',
              sent_at: new Date().toISOString(),
            })
        } catch (dbError) {
          console.error("Error saving failed Email request:", dbError)
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
    console.error("Error in POST /api/send-email:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}