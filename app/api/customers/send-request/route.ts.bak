import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import twilio from "twilio"
import nodemailer from "nodemailer"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      console.error("Error fetching user from session:", error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

// POST - Send individual review request to a customer
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { customer_id, request_type } = body

    // Validation
    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      )
    }

    if (!request_type || !["sms", "email"].includes(request_type)) {
      return NextResponse.json(
        { success: false, error: "Valid request type (sms or email) is required" },
        { status: 400 }
      )
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customer_id)
      .eq("user_id", userId)
      .single()

    if (customerError || !customer) {
      console.error("Error fetching customer:", customerError)
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      )
    }

    // Validate customer has the required contact method
    if (request_type === "email" && !customer.email) {
      return NextResponse.json(
        { success: false, error: "Customer has no email address" },
        { status: 400 }
      )
    }

    if (request_type === "sms" && !customer.phone) {
      return NextResponse.json(
        { success: false, error: "Customer has no phone number" },
        { status: 400 }
      )
    }

    // Get user's review link
    const { data: reviewLink, error: reviewLinkError } = await supabase
      .from("review_link")
      .select("id, review_url, company_name")
      .eq("user_id", userId)
      .single()

    if (reviewLinkError || !reviewLink) {
      console.error("Error fetching review link:", reviewLinkError)
      return NextResponse.json(
        { success: false, error: "Review link not found. Please set up your review link first." },
        { status: 404 }
      )
    }

    // Get user's SMS/Email template content from database
    let templateContent = ""
    let templateSubject = ""
    let fromEmail = ""
    let senderName = ""

    if (request_type === "sms") {
      // Fetch the latest SMS template from database
      const { data: smsTemplate, error: smsError } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("user_id", userId)
        .single()

      // Use template from database or default values if not found
      templateContent = smsTemplate?.content || `Hi {{customerName}}, how was your experience with {{companyName}}?
We'd love your quick feedback: {{reviewUrl}}

`
      senderName = smsTemplate?.sender_name || reviewLink.company_name || "Your Business"

      // If no SMS template exists, create a default one for future use
      if (smsError || !smsTemplate) {
        try {
          await supabase
            .from("sms_templates")
            .insert({
              user_id: userId,
              content: templateContent,
              sender_name: senderName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          } catch (createError) {
          console.error('⚠️ Could not create default SMS template:', createError)
        }
      }
    } else {
      // Fetch the latest Email template from database
      const { data: emailTemplate, error: emailError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("user_id", userId)
        .single()

      // Use template from database or default values if not found
      templateContent = emailTemplate?.content || `Hi {{customerName}},

We hope you enjoyed your experience with {{companyName}}. Could you take 30 seconds to share your thoughts?

Your feedback helps us improve and lets others know what to expect.

Leave a review: {{reviewUrl}}

Thanks for your time,
The {{companyName}} Team`
      templateSubject = emailTemplate?.subject || `How was your experience with {{companyName}}?`
      fromEmail = emailTemplate?.from_email || process.env.FROM_EMAIL || "noreply@yourcompany.com"

      // If no email template exists, create a default one for future use
      if (emailError || !emailTemplate) {
        try {
          await supabase
            .from("email_templates")
            .insert({
              user_id: userId,
              subject: templateSubject,
              content: templateContent,
              from_email: fromEmail,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          } catch (createError) {
          console.error('⚠️ Could not create default email template:', createError)
        }
      }
    }

    // Create trackable review URL with customer ID
    const trackableReviewUrl = `${reviewLink.review_url}?cid=${customer.id}`

    // Personalize the message (support both {{variable}} and [variable] formats)
    const personalizedContent = templateContent
      .replace(/\{\{customerName\}\}/g, customer.name)
      .replace(/\{\{companyName\}\}/g, reviewLink.company_name || 'Your Business')
      .replace(/\{\{reviewUrl\}\}/g, trackableReviewUrl)
      .replace(/\[Name\]/g, customer.name)
      .replace(/\[Company\]/g, reviewLink.company_name || 'Your Business')
      .replace(/\[reviewUrl\]/g, trackableReviewUrl)

    const personalizedSubject = templateSubject
      .replace(/\{\{customerName\}\}/g, customer.name)
      .replace(/\{\{companyName\}\}/g, reviewLink.company_name || 'Your Business')
      .replace(/\[Name\]/g, customer.name)
      .replace(/\[Company\]/g, reviewLink.company_name || 'Your Business')

    let sendResult = null
    let requestStatus = "pending"

    try {
      if (request_type === "sms") {
        // Send SMS
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken = process.env.TWILIO_AUTH_TOKEN
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

        if (!accountSid || !authToken || !twilioPhoneNumber) {
          throw new Error("Twilio configuration is missing")
        }

        const client = twilio(accountSid, authToken)

        const message = await client.messages.create({
          body: personalizedContent,
          from: twilioPhoneNumber,
          to: customer.phone
        })

        sendResult = { twilioSid: message.sid }
        requestStatus = "sent"

      } else {
        // Send Email
        const smtpHost = process.env.SMTP_HOST
        const smtpPort = process.env.SMTP_PORT
        const smtpUser = process.env.SMTP_USER
        const smtpPass = process.env.SMTP_PASS
        const fromEmailAddr = process.env.FROM_EMAIL

        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmailAddr) {
          throw new Error("SMTP configuration is missing")
        }

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })

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
        <h2 style="font-size: 20px; font-weight: bold; color: #1f2937;">${customer.name}</h2>
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

        const mailOptions = {
          from: `"${reviewLink.company_name || 'Your Business'}" <${fromEmailAddr}>`,
          to: customer.email,
          subject: personalizedSubject,
          text: personalizedContent,
          html: htmlContent,
        }

        const emailResponse = await transporter.sendMail(mailOptions)

        sendResult = { messageId: emailResponse.messageId }
        requestStatus = "sent"
      }
    } catch (sendError) {
      console.error(`Error sending ${request_type} to ${customer.name}:`, sendError)
      requestStatus = "failed"
      sendResult = { error: sendError.message }
    }

    // Save the request to review_requests table
    const { data: savedRequest, error: saveError } = await supabase
      .from("review_requests")
      .insert({
        user_id: userId,
        review_link_id: reviewLink.id,
        contact_name: customer.name,
        contact_phone: request_type === "sms" ? customer.phone : null,
        contact_email: request_type === "email" ? customer.email : null,
        request_type: request_type,
        content: personalizedContent,
        subject_line: request_type === "email" ? personalizedSubject : null,
        from_email: request_type === "email" ? fromEmail : null,
        sms_sender_name: request_type === "sms" ? senderName : null,
        status: requestStatus,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.error("Error saving request to database:", saveError)
      // Don't fail the request if database save fails, but log it
    }

    // Update customer's last request info
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        last_request_sent: new Date().toISOString(),
        last_request_type: request_type,
        last_request_status: requestStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", customer_id)
      .eq("user_id", userId)

    if (updateError) {
      console.error("Error updating customer:", updateError)
    }

    return NextResponse.json({
      success: true,
      data: {
        customer: customer.name,
        request_type: request_type,
        status: requestStatus,
        contact: request_type === "sms" ? customer.phone : customer.email,
        savedRequest: savedRequest,
        sendResult: sendResult
      }
    })

  } catch (error) {
    console.error("Error in POST /api/customers/send-request:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}