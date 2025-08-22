import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 TEST EMAIL TO YASSINE')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    const testEmail = 'essabar.yassine@gmail.com'
    
    // Step 1: Check if contact exists, if not add it
    const { data: existing } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', testEmail)
      .eq('campaign_id', campaignId)
      .single()
    
    let contact
    
    if (existing) {
      // Use existing contact
      contact = existing
      console.log('✅ Using existing contact:', contact?.id)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Test contact not found. Please add essabar.yassine@gmail.com to the campaign first.',
        hint: 'Go to the campaign and add this contact, then try again.'
      }, { status: 404 })
    }
    
    // Step 2: Get campaign sequences
    const { data: sequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    if (!sequences || sequences.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No sequences found for campaign'
      }, { status: 404 })
    }
    
    const firstSequence = sequences[0]
    
    // Step 3: Get a sender
    const { data: senders } = await supabase
      .from('campaign_senders')
      .select('email')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .eq('is_selected', true)
      .limit(1)
    
    if (!senders || senders.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active senders found'
      }, { status: 404 })
    }
    
    const senderEmail = senders[0].email
    
    // Step 4: Send test email
    console.log(`📧 Attempting to send email:`)
    console.log(`   From: ${senderEmail}`)
    console.log(`   To: ${testEmail}`)
    console.log(`   Subject: ${firstSequence.subject}`)
    
    // Check simulation mode
    const SIMULATION_MODE = process.env.EMAIL_SIMULATION_MODE !== 'false'
    
    if (SIMULATION_MODE) {
      console.log('🧪 SIMULATION MODE ACTIVE')
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Email would be sent but SIMULATION MODE is active',
        contact: {
          id: contact?.id,
          email: testEmail,
          name: `${contact?.first_name} ${contact?.last_name}`
        },
        email: {
          from: senderEmail,
          to: testEmail,
          subject: firstSequence.subject,
          content: firstSequence.content?.substring(0, 100) + '...'
        },
        config: {
          EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE || 'not set (defaults to true)',
          SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'Set' : 'Not set'
        },
        hint: 'Set EMAIL_SIMULATION_MODE=false to send real emails'
      })
    }
    
    // Check for SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SENDGRID_API_KEY not configured',
        hint: 'Set SENDGRID_API_KEY environment variable'
      }, { status: 500 })
    }
    
    // Send real email via SendGrid
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const personalizedSubject = firstSequence.subject
      .replace(/\{\{firstName\}\}/g, contact?.first_name || 'there')
      .replace(/\{\{lastName\}\}/g, contact?.last_name || '')
      .replace(/\{\{company\}\}/g, contact?.company || 'your company')
    
    const personalizedContent = firstSequence.content
      .replace(/\{\{firstName\}\}/g, contact?.first_name || 'there')
      .replace(/\{\{lastName\}\}/g, contact?.last_name || '')
      .replace(/\{\{company\}\}/g, contact?.company || 'your company')
    
    const msg = {
      to: testEmail,
      from: {
        email: senderEmail,
        name: senderEmail.split('@')[0]
      },
      subject: personalizedSubject,
      html: personalizedContent,
      text: personalizedContent.replace(/<[^>]*>/g, '')
    }
    
    try {
      const result = await sgMail.send(msg)
      console.log('✅ Email sent successfully!')
      
      // Log to inbox
      await supabase
        .from('inbox_messages')
        .insert({
          user_id: 'd155d4c2-2f06-45b7-9c90-905e3648e8df',
          message_id: result[0]?.headers?.['x-message-id'] || `test_${Date.now()}`,
          conversation_id: `test_${contact?.id}_${Date.now()}`,
          contact_email: testEmail,
          contact_name: `${contact?.first_name} ${contact?.last_name}`,
          sender_email: senderEmail,
          subject: personalizedSubject,
          body_text: personalizedContent.replace(/<[^>]*>/g, ''),
          body_html: personalizedContent,
          direction: 'outbound',
          channel: 'email',
          status: 'read',
          folder: 'sent',
          provider: 'sendgrid',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
      
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully!',
        contact: {
          id: contact?.id,
          email: testEmail,
          name: `${contact?.first_name} ${contact?.last_name}`
        },
        email: {
          from: senderEmail,
          to: testEmail,
          subject: personalizedSubject,
          messageId: result[0]?.headers?.['x-message-id']
        },
        status: 'Check your Gmail inbox!'
      })
      
    } catch (sendError: any) {
      console.error('❌ SendGrid error:', sendError)
      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
        details: sendError.response?.body || sendError.message
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}