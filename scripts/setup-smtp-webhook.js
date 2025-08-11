#!/usr/bin/env node

/**
 * SMTP Webhook Setup
 * 
 * This script helps you configure SMTP webhooks as an alternative to Gmail Pub/Sub.
 */

const fs = require('fs')
const path = require('path')

async function setupSMTPWebhook() {
  console.log('📨 SMTP WEBHOOK SETUP')
  console.log('====================\n')

  console.log('🔧 Option 1: Email Forwarding Rules')
  console.log('===================================')
  console.log('')
  console.log('Set up email forwarding in your email provider:')
  console.log('')
  
  console.log('📧 Gmail Forwarding:')
  console.log('1. Go to Gmail Settings > Forwarding and POP/IMAP')
  console.log('2. Add forwarding address: webhook@yourdomain.com')
  console.log('3. Verify the forwarding address')
  console.log('4. Choose "Forward a copy of incoming mail to..."')
  console.log('5. Set up MX records for webhook@yourdomain.com')
  console.log('')
  
  console.log('📧 Outlook/Office 365 Forwarding:')
  console.log('1. Go to Outlook Settings > Mail > Forwarding')
  console.log('2. Enable forwarding to: webhook@yourdomain.com')
  console.log('3. Choose "Keep a copy of forwarded messages"')
  console.log('')

  console.log('🔧 Option 2: Third-Party Email Services')
  console.log('=======================================')
  console.log('')
  
  console.log('📨 SendGrid Inbound Parse:')
  console.log('1. Go to SendGrid > Settings > Inbound Parse')
  console.log('2. Add hostname: mail.yourdomain.com')
  console.log('3. Set URL: https://yourdomain.com/api/webhooks/sendgrid')
  console.log('4. Update MX records:')
  console.log('   MX 10 mx.sendgrid.net')
  console.log('')
  
  console.log('📨 Mailgun Routes:')
  console.log('1. Go to Mailgun > Receiving > Routes')
  console.log('2. Create route for: match_recipient(".*@yourdomain.com")')
  console.log('3. Action: forward("https://yourdomain.com/api/webhooks/mailgun")')
  console.log('4. Update MX records:')
  console.log('   MX 10 mxa.mailgun.org')
  console.log('   MX 10 mxb.mailgun.org')
  console.log('')

  console.log('🔧 Option 3: SMTP Server Setup')
  console.log('==============================')
  console.log('')
  console.log('Set up your own SMTP server with Postfix:')
  console.log('')
  
  const postfixConfig = `
# /etc/postfix/main.cf
myhostname = mail.yourdomain.com
mydomain = yourdomain.com
myorigin = $mydomain
inet_interfaces = all
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain

# Virtual alias for webhook processing
virtual_alias_domains = yourdomain.com
virtual_alias_maps = hash:/etc/postfix/virtual

# /etc/postfix/virtual
@yourdomain.com webhook-processor

# /etc/aliases  
webhook-processor: "|/usr/local/bin/webhook-processor.sh"
`

  console.log(postfixConfig)
  
  console.log('🔐 Step 4: Environment Variables')
  console.log('================================')
  console.log('')
  console.log('Add these to your .env.local file:')
  console.log('')
  
  const envVars = `
# SMTP Webhook Configuration
SMTP_WEBHOOK_ENABLED=true
SMTP_WEBHOOK_SECRET=your-secure-random-string
SMTP_WEBHOOK_EMAIL=webhook@yourdomain.com

# Email Provider Settings
EMAIL_PROVIDER=sendgrid  # or mailgun, postmark, custom
SENDGRID_WEBHOOK_SECRET=your-sendgrid-secret
MAILGUN_WEBHOOK_SECRET=your-mailgun-secret

# Domain Configuration  
WEBHOOK_DOMAIN=https://yourdomain.com
MX_DOMAIN=mail.yourdomain.com

# Security
WEBHOOK_IP_WHITELIST=198.2.128.0/20,198.61.254.0/24  # SendGrid IPs
`

  console.log(envVars)
  
  console.log('🛠️ Step 5: Webhook Processor Script')
  console.log('===================================')
  console.log('')
  
  // Create webhook processor script
  const webhookProcessor = `#!/bin/bash
# /usr/local/bin/webhook-processor.sh
# SMTP to HTTP webhook forwarder

# Read email from stdin
EMAIL_CONTENT=$(cat)

# Extract headers and body
FROM=$(echo "$EMAIL_CONTENT" | grep "^From:" | head -1)
TO=$(echo "$EMAIL_CONTENT" | grep "^To:" | head -1) 
SUBJECT=$(echo "$EMAIL_CONTENT" | grep "^Subject:" | head -1)
DATE=$(echo "$EMAIL_CONTENT" | grep "^Date:" | head -1)

# Send to webhook endpoint
curl -X POST "https://yourdomain.com/api/webhooks/smtp" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SMTP_WEBHOOK_SECRET" \\
  -d "{
    \\"from\\": \\"$FROM\\",
    \\"to\\": \\"$TO\\",
    \\"subject\\": \\"$SUBJECT\\",
    \\"date\\": \\"$DATE\\",
    \\"raw_email\\": \\"$(echo "$EMAIL_CONTENT" | base64 -w 0)\\"
  }"
`

  // Create scripts directory if it doesn't exist
  const scriptsDir = path.join(process.cwd(), 'scripts')
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir)
  }
  
  // Write webhook processor
  fs.writeFileSync(
    path.join(scriptsDir, 'webhook-processor.sh'),
    webhookProcessor
  )
  
  console.log('✅ Created scripts/webhook-processor.sh')
  console.log('   Make executable: chmod +x scripts/webhook-processor.sh')
  console.log('')

  console.log('🔍 Step 6: DNS Configuration')
  console.log('============================')
  console.log('')
  console.log('Update your DNS records:')
  console.log('')
  
  const dnsRecords = `
# MX Records (for receiving email)
MX 10 mail.yourdomain.com
MX 20 mail2.yourdomain.com  # backup

# A Record (for mail server)
mail.yourdomain.com    A    your.server.ip.address

# SPF Record (for email authentication)
yourdomain.com    TXT    "v=spf1 include:_spf.google.com ~all"

# DKIM Record (get from your email provider)
default._domainkey.yourdomain.com    TXT    "v=DKIM1; k=rsa; p=YOUR_DKIM_KEY"

# DMARC Record
_dmarc.yourdomain.com    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
`

  console.log(dnsRecords)
  
  console.log('🧪 Step 7: Testing SMTP Webhooks')
  console.log('================================')
  console.log('')
  console.log('1. Test webhook endpoint:')
  console.log('   curl -X POST https://yourdomain.com/api/webhooks/smtp \\')
  console.log('     -H "Content-Type: application/json" \\')
  console.log('     -H "Authorization: Bearer your-secret" \\')
  console.log('     -d \'{"test": true}\'')
  console.log('')
  console.log('2. Send test email to: test@yourdomain.com')
  console.log('3. Check webhook logs for incoming requests')
  console.log('4. Verify email parsing and database insertion')
  console.log('')
  
  console.log('🔧 Step 8: Webhook Security')
  console.log('===========================')
  console.log('')
  console.log('Implement these security measures:')
  console.log('')
  
  console.log('1. IP Whitelisting:')
  console.log('   - SendGrid: 198.2.128.0/20, 198.61.254.0/24')
  console.log('   - Mailgun: Check Mailgun documentation')
  console.log('   - Custom: Your server IP ranges')
  console.log('')
  
  console.log('2. Webhook Signatures:')
  console.log('   - Verify HMAC signatures from providers')
  console.log('   - Use webhook secrets for authentication')
  console.log('   - Implement timestamp validation')
  console.log('')
  
  console.log('3. Rate Limiting:')
  console.log('   - Limit requests per IP per minute')
  console.log('   - Implement exponential backoff')
  console.log('   - Monitor for spam/abuse')
  console.log('')
  
  // Create example webhook handler
  const webhookHandler = `
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
`

  fs.writeFileSync(
    path.join(process.cwd(), 'webhook-handler-example.js'),
    webhookHandler
  )
  
  console.log('✅ Created webhook-handler-example.js')
  console.log('')
  
  console.log('📋 Next Steps')
  console.log('=============')
  console.log('1. ✅ Choose your preferred method (Gmail forward, SendGrid, etc.)')
  console.log('2. ✅ Configure DNS and MX records')
  console.log('3. ✅ Set up environment variables')
  console.log('4. ✅ Test webhook endpoints')
  console.log('5. ✅ Send test emails and verify capture')
  console.log('6. ✅ Monitor and debug')
  console.log('')
  
  console.log('🎯 Recommended Approach:')
  console.log('1. Start with SendGrid Inbound Parse (easiest)')
  console.log('2. Test with a subdomain first (mail.test.yourdomain.com)')
  console.log('3. Gradually roll out to production domain')
  console.log('')
  
  console.log('📖 Documentation:')
  console.log('- SendGrid Parse: https://docs.sendgrid.com/for-developers/parsing-email/inbound-email')
  console.log('- Mailgun Routes: https://documentation.mailgun.com/en/latest/user_manual.html#routes')
  console.log('- Postfix: http://www.postfix.org/documentation.html')
  console.log('')
}

// Run the setup guide
setupSMTPWebhook().then(() => {
  console.log('✅ SMTP webhook setup guide complete')
  console.log('🔧 Run: node scripts/test-webhook-setup.js to test your configuration')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})