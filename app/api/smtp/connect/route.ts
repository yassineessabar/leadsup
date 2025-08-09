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

    const { 
      name,
      email, 
      smtpHost, 
      smtpPort, 
      smtpSecure,
      smtpUser, 
      smtpPassword,
      imapHost,
      imapPort,
      imapSecure
    } = await request.json()

    if (!name || !email || !smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
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
    } catch (smtpError) {
      console.error('SMTP connection failed:', smtpError)
      return NextResponse.json({ 
        error: 'SMTP connection failed. Please check your settings.' 
      }, { status: 400 })
    }

    // Check if user exists
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'User not found. Please try logging in again.' 
      }, { status: 404 })
    }

    // Check if account already exists
    const { data: existingAccount } = await supabaseServer
      .from('smtp_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', email)
      .single()

    const accountData = {
      user_id: userId,
      name,
      email,
      smtp_host: smtpHost,
      smtp_port: parseInt(smtpPort),
      smtp_secure: smtpSecure === 'true' || smtpPort === '465',
      smtp_user: smtpUser,
      smtp_password: smtpPassword,
      imap_host: imapHost || null,
      imap_port: imapPort ? parseInt(imapPort) : null,
      imap_secure: imapSecure === 'true' || imapPort === '993',
      updated_at: new Date().toISOString()
    }

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabaseServer
        .from('smtp_accounts')
        .update(accountData)
        .eq('id', existingAccount.id)

      if (updateError) {
        console.error('Database update error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update SMTP account' 
        }, { status: 500 })
      }
    } else {
      // Insert new account
      accountData.created_at = new Date().toISOString()
      
      const { error: dbError } = await supabaseServer
        .from('smtp_accounts')
        .insert(accountData)

      if (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.json({ 
          error: 'Failed to save SMTP account' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'SMTP account connected successfully'
    })

  } catch (error) {
    console.error('SMTP connect error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}