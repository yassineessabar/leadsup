import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Email configuration
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.FROM_EMAIL || "noreply@loopreview.com"

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error("SMTP configuration missing")
      return NextResponse.json({ success: false, error: "Email service not configured" }, { status: 500 })
    }

    // Initialize nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Email content for support team
    const supportEmailSubject = `Support Request: ${subject}`
    const supportEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

    <h1 style="color: #333; margin-bottom: 20px; font-size: 24px;">New Support Request</h1>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
      <h2 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">Contact Information</h2>
      <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h2 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">Message</h2>
      <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px;">
        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
    </div>

    <div style="border-top: 1px solid #dee2e6; padding-top: 20px; color: #6c757d; font-size: 14px;">
      <p style="margin: 0;">Received: ${new Date().toLocaleString()}</p>
      <p style="margin: 5px 0 0 0;">Please respond to: ${email}</p>
    </div>

  </div>
</body>
</html>
    `

    const supportEmailText = `
New Support Request

Contact Information:
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

Received: ${new Date().toLocaleString()}
Please respond to: ${email}
    `

    // Send email to support team
    try {
      await transporter.sendMail({
        from: `"Loop Review Support" <${fromEmail}>`,
        to: "loopreviewhelp@gmail.com",
        subject: supportEmailSubject,
        text: supportEmailText,
        html: supportEmailHtml,
        replyTo: email, // Allow direct reply to customer
      })

      return NextResponse.json({
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!"
      })
    } catch (emailError) {
      console.error("Error sending support email:", emailError)
      return NextResponse.json({ success: false, error: "Failed to send support email" }, { status: 500 })
    }

  } catch (error) {
    console.error("❌ Error in support-email API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}