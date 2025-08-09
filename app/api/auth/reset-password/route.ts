import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    // Validate input
    if (!token || !password) {
      return NextResponse.json({ success: false, error: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters long" }, { status: 400 })
    }

    // Find the reset token in database
    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("user_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle()

    if (tokenError) {
      console.error("Database error during token lookup:", tokenError.message)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (!resetToken) {
      return NextResponse.json({ success: false, error: "Invalid reset token" }, { status: 400 })
    }

    // Check if token has been used
    if (resetToken.used_at) {
      return NextResponse.json({ success: false, error: "Reset token has already been used" }, { status: 400 })
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(resetToken.expires_at)

    if (now > expiresAt) {
      return NextResponse.json({ success: false, error: "Reset token has expired" }, { status: 400 })
    }

    // Hash the new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update user's password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: hashedPassword })
      .eq("id", resetToken.user_id)

    if (updateError) {
      console.error("Error updating password:", updateError.message)
      return NextResponse.json({ success: false, error: "Failed to update password" }, { status: 500 })
    }

    // Mark the reset token as used
    const { error: markUsedError } = await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token)

    if (markUsedError) {
      console.error("Error marking token as used:", markUsedError.message)
      // Don't fail the request since password was already updated
    }

    return NextResponse.json({ success: true, message: "Password reset successfully" })

  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}