import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import nodemailer from "nodemailer"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate input
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    // Find user in database
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("id, email, company")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle()

    if (userError) {
      console.error("Database error during user lookup:", userError.message)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    // Always return success for security (don't reveal if email exists)
    const successMessage = "If an account with that email exists, we've sent you a reset link."

    if (!user) {
      // Return success even if user doesn't exist for security
      return NextResponse.json({ success: true, message: successMessage })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Delete any existing reset tokens for this user
    await supabaseServer
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id)

    // Store new reset token in database
    const { error: tokenError } = await supabaseServer
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: resetTokenExpiry.toISOString(),
        created_at: new Date().toISOString()
      })

    if (tokenError) {
      console.error("Error storing reset token:", tokenError)
      console.error("Token data being inserted:", {
        user_id: user.id,
        token: resetToken,
        expires_at: resetTokenExpiry.toISOString(),
        created_at: new Date().toISOString()
      })
      return NextResponse.json({ success: false, error: `Failed to generate reset token: ${tokenError.message}` }, { status: 500 })
    }

    // Email configuration
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.FROM_EMAIL || "noreply@leadsup.com"

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error("SMTP configuration missing. Please configure SMTP settings.")
      console.error("Required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS")
      
      // For development, log the reset token to console
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 DEV MODE: Reset token for ${user.email}: ${resetToken}`)
        console.log(`🔗 DEV MODE: Reset URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`)
        return NextResponse.json({ 
          success: true, 
          message: "Development mode: Check console for reset link",
          devToken: resetToken // Only in development
        })
      }
      
      return NextResponse.json({ success: false, error: "Email service not configured. Please contact support." }, { status: 500 })
    }

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`

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

    // Email content
    const subject = "Reset Your Password"
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: rgb(243, 243, 241); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; margin-top: 40px; margin-bottom: 40px;">

    <!-- Header -->
    <div style="padding: 40px 32px 32px 32px; text-align: center; background-color: white;">
      <h1 style="font-size: 32px; font-weight: 300; color: #1f2937; margin: 0; letter-spacing: -0.5px;">LeadsUp</h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 0 32px 40px 32px;">
      <h2 style="font-size: 22px; font-weight: 400; color: #1f2937; margin: 0 0 16px 0;">Reset Your Password</h2>
      
      <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>

      <!-- Reset Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}"
           style="display: inline-block; background-color: rgb(87, 140, 255); color: white; padding: 14px 28px;
                  border-radius: 12px; text-decoration: none; font-weight: 500; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 14px; margin: 24px 0 0 0; line-height: 1.4;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: rgb(249, 250, 251); padding: 24px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} LeadsUp
      </p>
    </div>
  </div>
</body>
</html>
    `

    const textContent = `
Reset Your Password

We received a request to reset your password. 

Click this link to reset your password: ${resetUrl}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

© ${new Date().getFullYear()} LeadsUp
    `

    // Send email
    try {
      await transporter.sendMail({
        from: `"LeadsUp Support" <${fromEmail}>`,
        to: user.email,
        subject: subject,
        text: textContent,
        html: htmlContent,
      })

      return NextResponse.json({ success: true, message: successMessage })
    } catch (emailError) {
      console.error("Error sending reset email:", emailError)
      return NextResponse.json({ success: false, error: "Failed to send reset email" }, { status: 500 })
    }

  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}