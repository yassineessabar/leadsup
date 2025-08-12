import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required')
}
sgMail.setApiKey(SENDGRID_API_KEY)

export interface SendGridEmailOptions {
  to: string
  from: string
  fromName?: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
  attachments?: Array<{
    content: string
    filename: string
    type?: string
    disposition?: string
    contentId?: string
  }>
}

export async function sendEmailWithSendGrid(options: SendGridEmailOptions) {
  try {
    console.log(`📧 Sending email via SendGrid to ${options.to}`)
    
    // Use a default verified sender if from email is not verified
    // In production, you'd want to verify your sender domains
    const verifiedFrom = options.from || 'noreply@leadsup.io' // Use your verified domain
    
    const msg = {
      to: options.to,
      from: {
        email: verifiedFrom,
        name: options.fromName || verifiedFrom
      },
      subject: options.subject,
      text: options.text || '',
      html: options.html || options.text || '',
      replyTo: options.replyTo || verifiedFrom,
      attachments: options.attachments || []
    }

    const result = await sgMail.send(msg)
    
    console.log(`✅ Email sent successfully via SendGrid - Message ID: ${result[0]?.headers?.['x-message-id']}`)
    
    return {
      success: true,
      messageId: result[0]?.headers?.['x-message-id'] || `sendgrid-${Date.now()}`,
      provider: 'sendgrid',
      method: 'sendgrid_api'
    }
    
  } catch (error: any) {
    console.error('❌ SendGrid send error:', error)
    
    // Extract error details from SendGrid response
    let errorMessage = 'Failed to send via SendGrid'
    if (error.response?.body?.errors) {
      errorMessage = error.response.body.errors.map((e: any) => e.message).join(', ')
    } else if (error.message) {
      errorMessage = error.message
    }
    
    throw new Error(`SendGrid error: ${errorMessage}`)
  }
}

export { sgMail }