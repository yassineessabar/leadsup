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
      smtpPassword
    } = await request.json()

    if (!name || !email || !smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return NextResponse.json({ error: 'Missing required SMTP fields' }, { status: 400 })
    }

    // Test SMTP connection
    const port = typeof smtpPort === 'string' ? parseInt(smtpPort) : smtpPort
    
    // Determine security settings based on port and user preference
    let secure = false
    let requireTLS = false
    
    if (port === 465) {
      secure = true // SSL/TLS from start
    } else if (port === 587 || port === 25) {
      secure = false
      requireTLS = true // STARTTLS
    } else {
      secure = smtpSecure === true
      requireTLS = !secure
    }
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: secure,
      requireTLS: requireTLS,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1'
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      debug: false,
      logger: false
    })

    try {
      await transporter.verify()
    } catch (smtpError) {
      console.error('SMTP connection failed:', smtpError)
      
      // Provide specific error messages based on error type
      let errorMessage = 'SMTP connection failed. Please check your settings.'
      
      if (smtpError.code === 'ESOCKET') {
        if (smtpError.reason === 'wrong version number') {
          errorMessage = `SSL/TLS configuration error. Try these settings:
          - For Gmail: Port 587 with TLS enabled, or Port 465 with SSL
          - For Outlook: Port 587 with TLS enabled
          - Check if you're using the correct security settings for port ${port}`
        } else {
          errorMessage = `Connection failed. Please verify:
          - SMTP server address: ${smtpHost}
          - Port: ${port}
          - Network connectivity`
        }
      } else if (smtpError.code === 'EAUTH') {
        if (smtpError.response && smtpError.response.includes('Application-specific password required')) {
          errorMessage = `Gmail App Password Required:
          1. Enable 2-Factor Authentication in your Google Account
          2. Go to Google Account Settings → Security → App passwords
          3. Generate an app password for "Mail"
          4. Use that 16-character password instead of your regular password
          
          More info: https://support.google.com/mail/?p=InvalidSecondFactor`
        } else {
          errorMessage = `Authentication failed. Please verify:
          - Username/Email: ${smtpUser}
          - Password (for Gmail, use App Password, not regular password)
          - Two-factor authentication settings`
        }
      } else if (smtpError.code === 'ECONNECTION') {
        errorMessage = `Cannot connect to ${smtpHost}:${port}. Please check:
        - Server address is correct
        - Port is accessible
        - Firewall settings`
      }
      
      return NextResponse.json({ 
        error: errorMessage 
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

    // Try to save with all columns first, then fallback to basic columns
    let accountData = {
      user_id: userId,
      name,
      email,
      smtp_host: smtpHost,
      smtp_port: port,
      smtp_secure: secure,
      smtp_user: smtpUser,
      smtp_password: smtpPassword,
      updated_at: new Date().toISOString()
    }

    let saveError = null

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabaseServer
        .from('smtp_accounts')
        .update(accountData)
        .eq('id', existingAccount.id)
      
      saveError = updateError
    } else {
      // Insert new account
      accountData.created_at = new Date().toISOString()
      
      const { error: dbError } = await supabaseServer
        .from('smtp_accounts')
        .insert(accountData)
      
      saveError = dbError
    }

    // If save failed due to missing columns, try with basic columns only
    if (saveError && saveError.message && saveError.message.includes('Could not find')) {
      console.log('Trying with basic columns only due to schema limitations')
      
      // Basic account data with only columns that definitely exist
      const basicAccountData = {
        user_id: userId,
        name, // Required field based on NOT NULL constraint
        email,
        smtp_host: smtpHost,
        smtp_port: port,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        updated_at: new Date().toISOString()
      }

      if (existingAccount) {
        const { error: basicUpdateError } = await supabaseServer
          .from('smtp_accounts')
          .update(basicAccountData)
          .eq('id', existingAccount.id)

        if (basicUpdateError) {
          console.error('Database update error (basic):', basicUpdateError)
          return NextResponse.json({ 
            error: 'Failed to update SMTP account' 
          }, { status: 500 })
        }
      } else {
        basicAccountData.created_at = new Date().toISOString()
        
        const { error: basicDbError } = await supabaseServer
          .from('smtp_accounts')
          .insert(basicAccountData)

        if (basicDbError) {
          console.error('Database error (basic):', basicDbError)
          return NextResponse.json({ 
            error: 'Failed to save SMTP account' 
          }, { status: 500 })
        }
      }
    } else if (saveError) {
      console.error('Database error:', saveError)
      return NextResponse.json({ 
        error: 'Failed to save SMTP account' 
      }, { status: 500 })
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