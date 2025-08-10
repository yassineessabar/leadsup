import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Send email via Gmail API instead of SMTP
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { to, subject, content, from } = body

    const testTo = to || 'essabar.yassine@gmail.com'
    const testFrom = from || 'essabar.yassine@gmail.com'
    const testSubject = subject || '🚀 OAuth Gmail API Test - Success!'
    const testContent = content || `
      <h2>🎯 Gmail API Email Sending Working!</h2>
      <p>This email was sent using:</p>
      <ul>
        <li>✅ Gmail API (not SMTP)</li>
        <li>✅ OAuth2 authentication</li>
        <li>✅ Your existing frontend tokens</li>
      </ul>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p><strong>Method:</strong> Gmail API v1</p>
      <hr>
      <p><small>This proves OAuth email sending works! 🚀</small></p>
    `

    console.log(`📧 Sending email via Gmail API from ${testFrom} to ${testTo}...`)

    // Get sender data for the specified account
    const { data: senderData, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        name,
        access_token,
        refresh_token
      `)
      .eq('email', testFrom)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (senderError || !senderData || !senderData.access_token) {
      return NextResponse.json({
        success: false,
        error: `No valid OAuth token found for ${testFrom}`
      })
    }

    // Use nodemailer to create proper email structure, then extract raw for Gmail API
    const nodemailer = require('nodemailer')
    
    // Create a test transport to generate the email
    const testTransport = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    })
    
    const mailOptions = {
      from: `${senderData.name || senderData.email} <${senderData.email}>`,
      to: testTo,
      subject: testSubject,
      html: testContent
    }
    
    // Generate the email using nodemailer
    const info = await testTransport.sendMail(mailOptions)
    const emailMessage = info.message.toString()
    
    // Encode email message in base64url format for Gmail API
    const encodedMessage = Buffer.from(emailMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    console.log(`🔐 Using Gmail API with OAuth token...`)

    // Send email using Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${senderData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Gmail API send failed:', errorText)
      
      return NextResponse.json({
        success: false,
        error: `Gmail API error: ${response.status} ${response.statusText}`,
        details: errorText
      })
    }

    const result = await response.json()
    console.log(`✅ Email sent via Gmail API! Message ID: ${result.id}`)

    return NextResponse.json({
      success: true,
      method: 'gmail_api',
      message_id: result.id,
      thread_id: result.threadId,
      sent_to: testTo,
      sent_from: senderData.email,
      sender_name: senderData.name,
      subject: testSubject,
      sent_at: new Date().toISOString(),
      result: [
        '🎉 SUCCESS! Email sent via Gmail API',
        '✅ OAuth2 authentication works perfectly',
        '✅ No SMTP issues',
        '✅ Using your existing frontend tokens',
        '',
        'This proves the OAuth setup is working!',
        'We can now use Gmail API instead of SMTP for all email sending.'
      ]
    })

  } catch (error) {
    console.error('❌ Error sending via Gmail API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}