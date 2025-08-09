import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/gmail-auth'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, to, subject, body } = await request.json()

    if (!accountId || !to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the SMTP account (including sensitive data for sending)
    const { data: account, error: accountError } = await supabaseServer
      .from('smtp_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_secure,
      auth: {
        user: account.smtp_user,
        pass: account.smtp_password,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // Send email
    try {
      const info = await transporter.sendMail({
        from: `"${account.name}" <${account.email}>`,
        to: to,
        subject: subject,
        html: body
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully',
        messageId: info.messageId
      })
    } catch (sendError) {
      console.error('Email send error:', sendError)
      return NextResponse.json({ 
        error: 'Failed to send email. Please check your SMTP settings.' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}