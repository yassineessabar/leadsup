import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "@/lib/supabase"

interface FeedbackData {
  name: string
  email: string
  subject?: string
  message: string
}

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await getSupabaseServerClient()
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

// POST - Submit feedback
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    let body: FeedbackData
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { name, email, subject, message } = body

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: name, email, and message are required" 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid email format" 
      }, { status: 400 })
    }


    // Store feedback in database (optional - for tracking)
    try {
      const { error: dbError } = await getSupabaseServerClient()
        .from("feedback")
        .insert({
          user_id: userId,
          name: name.trim(),
          email: email.trim(),
          subject: subject?.trim() || null,
          message: message.trim(),
          created_at: new Date().toISOString()
        })

      if (dbError) {
        // Continue with email sending even if DB storage fails
      } else {
      }
    } catch (dbError) {
      // Continue with email sending even if DB storage fails
    }

    // Send feedback email
    try {
      const feedbackEmailResponse = await sendFeedbackEmail({
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim() || "Feedback from LeadsUp User",
        message: message.trim(),
        userId
      })

      if (feedbackEmailResponse.success) {
        
        return NextResponse.json({
          success: true,
          message: "Feedback submitted successfully! We'll get back to you soon."
        })
      } else {
        throw new Error(feedbackEmailResponse.error || "Failed to send feedback email")
      }
    } catch (emailError) {
      
      return NextResponse.json({
        success: false,
        error: "Failed to send feedback email. Please try again later."
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

async function sendFeedbackEmail(feedback: FeedbackData & { userId: string }): Promise<{ success: boolean; error?: string }> {
  try {
    // Use SendGrid API to send the feedback email
    const sendGridApiKey = process.env.SENDGRID_API_KEY
    if (!sendGridApiKey) {
      throw new Error("SendGrid API key not configured")
    }

    const emailContent = `
New feedback received from LeadsUp user:

Name: ${feedback.name}
Email: ${feedback.email}
User ID: ${feedback.userId}
Subject: ${feedback.subject}

Message:
${feedback.message}

---
Sent from LeadsUp Feedback System
Timestamp: ${new Date().toISOString()}
    `.trim()

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendGridApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: "weleadsup@gmail.com", name: "LeadsUp Feedback" }],
          subject: `LeadsUp Feedback: ${feedback.subject}`
        }],
        from: { 
          email: "noreply@leadsupbase.com", 
          name: "LeadsUp Feedback System" 
        },
        reply_to: { 
          email: feedback.email, 
          name: feedback.name 
        },
        content: [{
          type: "text/plain",
          value: emailContent
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid API error: ${response.status}`)
    }

    return { success: true }

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }
  }
}