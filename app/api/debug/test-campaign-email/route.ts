import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json()
    
    if (!testEmail) {
      return NextResponse.json({ error: 'testEmail required' }, { status: 400 })
    }
    
    console.log(`🧪 Testing campaign email send to ${testEmail}`)
    
    // Get a campaign to test with
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'Active')
      .limit(1)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'No active campaign found' }, { status: 404 })
    }
    
    // Get a sender for this campaign
    const { data: sender, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (senderError || !sender) {
      return NextResponse.json({ error: 'No active sender found for campaign' }, { status: 404 })
    }
    
    console.log(`📊 Using campaign: ${campaign.name} (${campaign.id})`)
    console.log(`👤 Using sender: ${sender.email}`)
    console.log(`🎯 User ID: ${campaign.user_id}`)
    
    // Send test email using SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ error: 'SendGrid API key not configured' }, { status: 500 })
    }
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    // Force reply@reply.domain format for webhook capture
    const senderDomain = sender.email.split('@')[1]
    const replyToEmail = `reply@reply.${senderDomain}`
    
    const subject = `🧪 Test Campaign Email - ${new Date().toISOString()}`
    const content = `
      <h2>Test Campaign Email</h2>
      <p>This is a test email to verify our campaign linking fixes.</p>
      <p><strong>Campaign:</strong> ${campaign.name}</p>
      <p><strong>Campaign ID:</strong> ${campaign.id}</p>
      <p><strong>User ID:</strong> ${campaign.user_id}</p>
      <p><strong>Sender:</strong> ${sender.email}</p>
      <p><strong>Reply-To:</strong> ${replyToEmail}</p>
      <p>Please reply to this email to test the webhook system!</p>
    `
    
    const msg = {
      to: testEmail,
      from: {
        email: sender.email,
        name: sender.name || sender.email.split('@')[0]
      },
      replyTo: replyToEmail,
      subject: subject,
      html: content,
      text: content.replace(/<[^>]*>/g, '')
    }
    
    console.log(`📧 Sending test email with proper campaign linking...`)
    
    const result = await sgMail.send(msg)
    const messageId = result[0]?.headers?.['x-message-id'] || `test_${Date.now()}`
    
    // Generate conversation ID for threading
    const generateConversationId = (contactEmail: string, senderEmail: string, campaignId: string) => {
      const participants = [contactEmail, senderEmail].sort().join('|')
      const base = participants + `|${campaignId}`
      return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    }
    
    const conversationId = generateConversationId(testEmail, sender.email, campaign.id)
    
    // Log to inbox_messages with proper campaign linking
    await supabase.from('inbox_messages').insert({
      user_id: campaign.user_id, // Use campaign's user_id
      message_id: messageId,
      conversation_id: conversationId,
      campaign_id: campaign.id, // Use campaign.id
      contact_email: testEmail,
      contact_name: 'Test Contact',
      sender_email: sender.email,
      subject: subject,
      body_text: content.replace(/<[^>]*>/g, ''),
      body_html: content,
      direction: 'outbound',
      channel: 'email',
      message_type: 'email',
      status: 'read',
      folder: 'sent',
      provider: 'sendgrid',
      provider_data: {
        test_email: true,
        reply_to: replyToEmail
      },
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    })
    
    // Create inbox thread
    await supabase
      .from('inbox_threads')
      .upsert({
        user_id: campaign.user_id, // Use campaign's user_id
        conversation_id: conversationId,
        campaign_id: campaign.id, // Use campaign.id
        contact_email: testEmail,
        contact_name: 'Test Contact',
        subject: subject,
        last_message_at: new Date().toISOString(),
        last_message_preview: content.replace(/<[^>]*>/g, '').substring(0, 150),
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })
    
    console.log(`✅ Test email sent and logged with proper campaign linking`)
    
    return NextResponse.json({
      success: true,
      message: 'Test campaign email sent successfully',
      details: {
        messageId,
        conversationId,
        campaignId: campaign.id,
        campaignName: campaign.name,
        userId: campaign.user_id,
        senderEmail: sender.email,
        replyTo: replyToEmail,
        recipientEmail: testEmail,
        subject: subject
      }
    })
    
  } catch (error) {
    console.error('❌ Error sending test campaign email:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}