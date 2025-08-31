import { type NextRequest, NextResponse } from "next/server"
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase'
import sgMail from '@sendgrid/mail'

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (error || !session) {
      return null
    }
    
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

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

    // Initialize SendGrid
    const sendGridApiKey = process.env.SENDGRID_API_KEY
    if (!sendGridApiKey) {
      console.error("SendGrid API key missing")
      return NextResponse.json({ success: false, error: "Email service not configured" }, { status: 500 })
    }
    
    sgMail.setApiKey(sendGridApiKey)

    // Store in database (using same table as feedback)
    const { error: dbError } = await supabaseServer
      .from('feedback')
      .insert({
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending'
      })

    if (dbError) {
      console.error('Error saving support request:', dbError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save support request' 
      }, { status: 500 })
    }

    // Send email to support team
    const emailContent = {
      to: 'weleadsup@gmail.com',
      from: {
        email: 'noreply@leadsup.io',
        name: 'LeadsUp Support Chat'
      },
      replyTo: {
        email: email,
        name: name
      },
      subject: `Support Chat: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Support Chat Message</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Contact Information</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Message</h3>
            <p style="line-height: 1.6; color: #374151;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <div style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            <p>Sent via LeadsUp Support Chat on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
      text: `
Support Chat Message

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

Sent: ${new Date().toLocaleString()}
      `
    }

    await sgMail.send(emailContent)

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully. We'll get back to you soon!"
    })

  } catch (error) {
    console.error("❌ Error in support-email API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}