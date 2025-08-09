import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      reviewUrlId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      rating,
      feedback,
      agreeToMarketing,
      selectedPlatform
    } = body

    // Validate required fields
    if (!reviewUrlId || !customerName || !customerEmail || !rating || !feedback) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Get review link and user data by URL pattern
    const { data: reviewLink, error: reviewLinkError } = await supabase
      .from("review_link")
      .select(`
        *,
        users (
          id,
          company,
          notification_email,
          email
        )
      `)
      .like("review_url", `%/r/${reviewUrlId}`)
      .single()

    if (reviewLinkError || !reviewLink) {
      return NextResponse.json(
        { success: false, error: "Review link not found" },
        { status: 404 }
      )
    }

    // Determine platform to use - prioritize selectedPlatform for speed
    let platformToUse = selectedPlatform || "internal"

    // Insert feedback as a new review
    const { data: savedFeedback, error: saveError } = await supabase
      .from("reviews")
      .insert({
        user_id: reviewLink.user_id,
        customer_name: customerName,
        customer_email: customerEmail,
        rating: rating,
        title: `Review from ${customerName}`,
        comment: feedback,
        platform: platformToUse,
        status: "published",
        response: null,
        helpful_count: 0,
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error("Error saving feedback:", saveError)
      return NextResponse.json(
        { success: false, error: "Failed to save feedback" },
        { status: 500 }
      )
    }

    // Return success immediately for faster UX
    const response = NextResponse.json({
      success: true,
      data: {
        id: savedFeedback?.id,
        message: "Feedback submitted successfully"
      }
    })

    // Send notification email asynchronously in background (non-blocking)
    setTimeout(async () => {
      try {
        const smtpHost = process.env.SMTP_HOST
        const smtpPort = process.env.SMTP_PORT
        const smtpUser = process.env.SMTP_USER
        const smtpPass = process.env.SMTP_PASS
        const fromEmailAddr = process.env.FROM_EMAIL

        if (smtpHost && smtpPort && smtpUser && smtpPass && fromEmailAddr) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          })

          // Determine recipient email (notification_email or fallback to user email)
          const recipientEmail = reviewLink.users?.notification_email || reviewLink.users?.email

          if (recipientEmail) {
            const stars = "★".repeat(rating) + "☆".repeat(5 - rating)
            const companyName = reviewLink.users?.company || reviewLink.company_name || "Your Business"

            // Safely escape content to prevent template issues
            const safeCustomerName = customerName.replace(/[<>"']/g, '')
            const safeCustomerEmail = customerEmail.replace(/[<>"']/g, '')
            const safeFeedback = feedback.replace(/[<>"']/g, '').replace(/\n/g, '<br>')

            const htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #e66465 0%, #9198e5 100%); padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">New Customer Feedback</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; margin-top: 0;">Customer Review for ${companyName}</h2>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #333;">Rating</h3>
                      <div style="font-size: 24px; color: #ffc107;">${stars}</div>
                      <div style="color: #666; font-size: 14px;">${rating} out of 5 stars</div>
                    </div>

                    <div style="margin: 20px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #333;">Customer Details</h3>
                      <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${safeCustomerName}</p>
                      <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${safeCustomerEmail}</p>
                    </div>

                    <div style="margin: 20px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #333;">Feedback</h3>
                      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; color: #333; line-height: 1.6;">
                        ${safeFeedback}
                      </div>
                    </div>

                    ${agreeToMarketing ? '<p style="color: #28a745; font-size: 14px;"><strong>✓</strong> Customer agreed to receive marketing communications</p>' : ''}
                  </div>
                </div>
                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                  <p>This notification was sent from your Loop review system</p>
                </div>
              </div>
            `

            const mailOptions = {
              from: `"Loop Reviews" <${fromEmailAddr}>`,
              to: recipientEmail,
              subject: `New ${rating}-star review from ${safeCustomerName}`,
              text: `New customer feedback for ${companyName}\n\nRating: ${rating}/5 stars\nCustomer: ${safeCustomerName} (${safeCustomerEmail})\n\nFeedback:\n${feedback}`,
              html: htmlContent,
            }

            await transporter.sendMail(mailOptions)
            } else {
            }
        } else {
          }
      } catch (emailError) {
        console.error("📧 Email notification error:", emailError)
      }
    }, 100)

  return response

  } catch (error) {
    console.error("Error in POST /api/public/feedback:", error)
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}