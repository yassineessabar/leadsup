import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
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
    const { data: user, error: userError } = await supabase
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
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id)

    // Store new reset token in database
    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: resetTokenExpiry.toISOString(),
        created_at: new Date().toISOString()
      })

    if (tokenError) {
      console.error("Error storing reset token:", tokenError.message)
      return NextResponse.json({ success: false, error: "Failed to generate reset token" }, { status: 500 })
    }

    // Email configuration
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.FROM_EMAIL || "noreply@yourbusiness.com"

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error("SMTP configuration missing")
      return NextResponse.json({ success: false, error: "Email service not configured" }, { status: 500 })
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
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">

    <!-- Main Content -->
    <div style="padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 8px;">Reset Your Password</h1>
        <p style="color: #6b7280;">We received a request to reset your password.</p>
      </div>

      <div style="margin-bottom: 32px;">
        <p style="color: #374151; margin-bottom: 16px;">Hi there,</p>
        <p style="color: #374151; margin-bottom: 16px;">
          You requested to reset your password for your ${user.company || 'LoopDev'} account.
          Click the button below to reset your password:
        </p>
      </div>

      <!-- Reset Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${resetUrl}"
           style="display: inline-block; background-color: #000; color: white; padding: 12px 32px;
                  border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset Password
        </a>
      </div>

      <div style="margin-bottom: 24px;">
        <p style="color: #374151; margin-bottom: 16px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #6b7280; word-break: break-all; font-size: 14px;">
          ${resetUrl}
        </p>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
          This link will expire in 1 hour for security reasons.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request this password reset, you can safely ignore this email.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px;">
        © ${new Date().getFullYear()} ${user.company || 'LoopDev'}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `

    const textContent = `
Reset Your Password

Hi there,

You requested to reset your password for your ${user.company || 'LoopDev'} account.

Click this link to reset your password: ${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} ${user.company || 'LoopDev'}. All rights reserved.
    `

    // Send email
    try {
      await transporter.sendMail({
        from: `"${user.company || 'LoopDev'}" <${fromEmail}>`,
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