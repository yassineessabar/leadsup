import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase, supabaseServer } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, first_name, last_name, company, title, phone } = body

    // Validate input
    if (!email || !password || !first_name) {
      return NextResponse.json({ success: false, error: "Email, password, and first name are required" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 },
      )
    }

    // Check if user already exists

    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, email, created_at")
      .eq("email", email.toLowerCase().trim()) // Ensure email is normalized
      .maybeSingle() // Use maybeSingle to handle no results gracefully

    if (checkError) {
      console.error("❌ Database error checking existing user:", checkError.message)
      return NextResponse.json({ success: false, error: "Database error during signup" }, { status: 500 })
    }

    if (existingUser) {
      return NextResponse.json({ success: false, error: "User already exists with this email" }, { status: 409 })
    }

    // Hash password with reduced rounds for faster signup (8 rounds is still secure)
    const passwordHash = await bcrypt.hash(password, 8)

    // Create new user in Supabase
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase().trim(), // Store normalized email
        password_hash: passwordHash,
        first_name: first_name.trim(),
        last_name: last_name?.trim() || "",
        company: company?.trim() || "",
        position: title?.trim() || "",
        phone_number: phone?.trim() || "",
      })
      .select()
      .single() // Use single() here as we expect exactly one new user

    if (userError || !newUser) {
      console.error("❌ User creation error:", userError?.message)
      return NextResponse.json({ success: false, error: "Failed to create user account" }, { status: 500 })
    }

    // Create session token
    const sessionToken = `session_${newUser.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Store session in Supabase using server client (bypasses RLS)
    const { error: sessionError, data: sessionData } = await supabaseServer
      .from("user_sessions")
      .insert({
        user_id: newUser.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()

    if (sessionError) {
      console.error("❌ Session creation error:", sessionError.message)
      console.error("❌ Session creation error details:", sessionError)
      return NextResponse.json({ success: false, error: "Failed to create session" }, { status: 500 })
    }

    // Create review_link record asynchronously after responding to user (don't await)
    // This reduces signup response time significantly
    setImmediate(() => {
      const generateRandomId = () => Math.random().toString(36).substring(2, 10)
      const baseUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://app.loopreview.io'
      const reviewUrl = `${baseUrl}/r/${generateRandomId()}`
      const qrCode = generateRandomId().toUpperCase()

      supabase.from("review_link").insert({
        user_id: newUser.id,
        company_name: newUser.company || "Your Company",
        review_url: reviewUrl,
        review_qr_code: qrCode,
        primary_color: "#000000",
        secondary_color: "#000000",
        show_badge: true,
        rating_page_content: `How was your experience with ${newUser.company || "us"}?`,
        redirect_message: "Thank you for your feedback! Please click the button below to leave a review.",
        internal_notification_message: "Thank you for your feedback! We appreciate you taking the time to share your thoughts.",
        video_upload_message: `Record a short video testimonial for ${newUser.company || "us"}!`,
        google_review_link: "",
        trustpilot_review_link: "",
        facebook_review_link: "",
        enabled_platforms: ["Google"],
        background_color: "#F0F8FF",
        text_color: "#1F2937",
        button_text_color: "#FFFFFF",
        font: "gothic-a1",
        links: [],
        header_settings: {
          header: "Great to hear!",
          text: "Thank you for your feedback! Please click the button below to leave a review."
        },
        initial_view_settings: {
          header: "How was your experience at {{companyName}}?",
          text: "We'd love to hear about your experience with our service."
        },
        negative_settings: {
          header: "We're sorry to hear that.",
          text: "Please tell us how we can improve:"
        },
        video_upload_settings: {
          header: "Share your experience!",
          text: "Record a short video testimonial to help others learn about our service."
        },
        success_settings: {
          header: "Thank you!",
          text: "Your feedback has been submitted successfully."
        }
      }).then(({ error }) => {
        if (error) {
          console.error("❌ Review link creation error:", error.message)
        }
      })
    })

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
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        company: newUser.company,
        position: newUser.position,
        phone_number: newUser.phone_number,
      },
    })
  } catch (error) {
    console.error("❌ Signup error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
