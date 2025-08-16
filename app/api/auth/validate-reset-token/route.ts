import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    // Validate input
    if (!token) {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 })
    }

    // Find the reset token in database
    const { data: resetToken, error: tokenError } = await supabaseServer
      .from("password_reset_tokens")
      .select("user_id, expires_at")
      .eq("token", token)
      .maybeSingle()

    if (tokenError) {
      console.error("Database error during token lookup:", tokenError)
      return NextResponse.json({ success: false, error: `Database error: ${tokenError.message}` }, { status: 500 })
    }

    if (!resetToken) {
      return NextResponse.json({ success: false, error: "Invalid reset token" }, { status: 400 })
    }

    // Note: For now, we skip the used_at check since the column might not exist
    // This will be handled by deleting the token after use instead

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(resetToken.expires_at)

    if (now > expiresAt) {
      return NextResponse.json({ success: false, error: "Reset token has expired" }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Token validation error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}