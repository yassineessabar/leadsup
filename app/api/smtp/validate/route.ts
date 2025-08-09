import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getCurrentUserId } from '@/lib/gmail-auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      smtpHost, 
      smtpPort, 
      smtpSecure,
      smtpUser, 
      smtpPassword
    } = await request.json()

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return NextResponse.json({ error: 'Missing required SMTP fields' }, { status: 400 })
    }

    // Test SMTP connection
    const transporter = nodemailer.createTransporter({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure === 'true' || smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    try {
      await transporter.verify()
      return NextResponse.json({ 
        success: true,
        message: 'SMTP connection successful'
      })
    } catch (smtpError) {
      console.error('SMTP connection failed:', smtpError)
      return NextResponse.json({ 
        success: false,
        error: 'SMTP connection failed. Please check your settings.',
        details: smtpError.message
      }, { status: 400 })
    }

  } catch (error) {
    console.error('SMTP validate error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}