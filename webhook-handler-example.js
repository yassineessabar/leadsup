
// Example SMTP webhook handler
export async function POST(request) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-webhook-signature')
    const body = await request.text()
    
    if (!verifyWebhookSignature(body, signature)) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Parse email data
    const emailData = JSON.parse(body)
    
    // Extract email details
    const { from, to, subject, text, html, attachments } = emailData
    
    // Process and store in database
    await processInboundEmail({
      from,
      to, 
      subject,
      bodyText: text,
      bodyHtml: html,
      attachments
    })
    
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Error', { status: 500 })
  }
}
