import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase, supabaseServer } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Find user in Supabase with only necessary fields for auth
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, password_hash, company, phone_number")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle()

    if (userError) {
      console.error("❌ Database error during user lookup:", userError.message)
      return NextResponse.json({ success: false, error: "Database error during login" }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Create session token
    const sessionToken = `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Store session in Supabase using server client (bypasses RLS)
    const { error: sessionError } = await supabaseServer
      .from("user_sessions")
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      console.error("❌ Session creation error:", sessionError.message)
      return NextResponse.json({ success: false, error: "Failed to create session" }, { status: 500 })
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        company: user.company,
        phone_number: user.phone_number,
      },
    })
  } catch (error) {
    console.error("❌ Login error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
