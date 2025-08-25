import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log(`🧪 Sending test email with FIXED campaign linking`)
    
    // Get active campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'Active')
      .limit(1)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'No active campaign found' }, { status: 404 })
    }
    
    // Get active sender  
    const { data: sender, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (senderError || !sender) {
      return NextResponse.json({ error: 'No active sender found' }, { status: 404 })
    }
    
    const testEmail = 'ya.essabarry@gmail.com'
    const senderDomain = sender.email.split('@')[1]
    const replyToEmail = `reply@reply.${senderDomain}`
    
    console.log(`📊 Campaign: ${campaign.name} (${campaign.id})`)
    console.log(`👤 User ID: ${campaign.user_id}`)
    console.log(`📧 Sender: ${sender.email}`)
    console.log(`📮 Reply-To: ${replyToEmail}`)
    
    // Send via SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ error: 'SendGrid API key not configured' }, { status: 500 })
    }
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const subject = `🔧 FIXED Campaign Email Test - ${new Date().toISOString()}`
    const content = `
      <h2>✅ FIXED Campaign Email Test</h2>
      <p>This email should now have PROPER campaign linking!</p>
      <ul>
        <li><strong>Campaign:</strong> ${campaign.name}</li>
        <li><strong>Campaign ID:</strong> ${campaign.id}</li>
        <li><strong>User ID:</strong> ${campaign.user_id}</li>
        <li><strong>Sender:</strong> ${sender.email}</li>
        <li><strong>Reply-To:</strong> ${replyToEmail}</li>
      </ul>
      <p><strong>🚨 PLEASE REPLY TO THIS EMAIL TO TEST THE WEBHOOK!</strong></p>
      <p>This should now work properly with campaign linking.</p>
    `
    
    const msg = {
      to: testEmail,
      from: {
        email: sender.email,
        name: 'LeadsUp Test'
      },
      replyTo: replyToEmail,
      subject: subject,
      html: content,
      text: content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
    }
    
    const result = await sgMail.send(msg)
    const messageId = result[0]?.headers?.['x-message-id'] || `fixed_test_${Date.now()}`
    
    // Generate conversation ID
    const generateConversationId = (contactEmail: string, senderEmail: string, campaignId: string) => {
      const participants = [contactEmail, senderEmail].sort().join('|')
      const base = participants + `|${campaignId}`
      return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    }
    
    const conversationId = generateConversationId(testEmail, sender.email, campaign.id)
    
    // Log with PROPER campaign linking
    await supabase.from('inbox_messages').insert({
      user_id: campaign.user_id, // ✅ FIXED: Use campaign's user_id
      message_id: messageId,
      conversation_id: conversationId,
      campaign_id: campaign.id, // ✅ FIXED: Use campaign.id instead of null
      contact_email: testEmail,
      contact_name: 'Yassine Test',
      sender_email: sender.email,
      subject: subject,
      body_text: content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''),
      body_html: content,
      direction: 'outbound',
      channel: 'email',
      message_type: 'email',
      status: 'read',
      folder: 'sent',
      provider: 'sendgrid',
      provider_data: {
        test_fixed: true,
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
        user_id: campaign.user_id, // ✅ FIXED: Use campaign's user_id
        conversation_id: conversationId,
        campaign_id: campaign.id, // ✅ FIXED: Use campaign.id
        contact_email: testEmail,
        contact_name: 'Yassine Test',
        subject: subject,
        last_message_at: new Date().toISOString(),
        last_message_preview: content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').substring(0, 150),
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })
    
    console.log(`✅ FIXED test email sent with proper campaign linking`)
    
    return NextResponse.json({
      success: true,
      message: 'FIXED test email sent successfully',
      details: {
        messageId,
        conversationId,
        campaignId: campaign.id, // ✅ Should NOT be null
        campaignName: campaign.name,
        userId: campaign.user_id, // ✅ Should NOT be hardcoded
        senderEmail: sender.email,
        replyTo: replyToEmail,
        recipientEmail: testEmail,
        subject: subject,
        fixed: true
      }
    })
    
  } catch (error) {
    console.error('❌ Error sending FIXED test email:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}