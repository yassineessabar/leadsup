# SendGrid Inbound Parse - Complete Setup Guide

## Prerequisites
- SendGrid account (free tier is fine)
- Domain name you control
- Access to DNS settings

---

## Step 1: Create SendGrid Account

1. Go to https://signup.sendgrid.com/
2. Sign up for free account (100 emails/day free)
3. Verify your email address
4. Complete account setup

---

## Step 2: Configure DNS Records

Add these MX records to your domain's DNS:

```
Type: MX
Host: reply (or @ for root domain)
Priority: 10
Value: mx.sendgrid.net
```

### Example DNS Setup:
- If your domain is `example.com`
- Create subdomain `reply.example.com`
- Point MX record to `mx.sendgrid.net`
- Emails to `anything@reply.example.com` will be captured

### DNS Provider Examples:

**Cloudflare:**
1. Go to DNS settings
2. Add record → Type: MX
3. Name: reply
4. Mail server: mx.sendgrid.net
5. Priority: 10

**Namecheap:**
1. Advanced DNS → Mail Settings
2. Add MX Record
3. Host: reply
4. Value: mx.sendgrid.net
5. Priority: 10

**GoDaddy:**
1. DNS Management
2. Add → MX
3. Host: reply
4. Points to: mx.sendgrid.net
5. Priority: 10

---

## Step 3: Configure SendGrid Inbound Parse

1. **Log into SendGrid Dashboard**
   - https://app.sendgrid.com

2. **Navigate to Settings**
   - Settings → Inbound Parse

3. **Add Host & URL**
   ```
   Subdomain: reply
   Domain: example.com
   Destination URL: https://your-app.com/api/webhooks/sendgrid
   ```

4. **Configure Options**
   - ✅ Check "POST the raw, full MIME message"
   - ✅ Check "Check incoming emails for spam"

5. **Save Configuration**

---

## Step 4: Create SendGrid Webhook Handler

Create `/app/api/webhooks/sendgrid/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import formidable from 'formidable'
import { createReadStream } from 'fs'

// Parse multipart form data from SendGrid
async function parseFormData(request: NextRequest) {
  const formData = await request.formData()
  
  return {
    from: formData.get('from') as string,
    to: formData.get('to') as string,
    subject: formData.get('subject') as string,
    text: formData.get('text') as string,
    html: formData.get('html') as string,
    envelope: JSON.parse(formData.get('envelope') as string || '{}'),
    email: formData.get('email') as string, // Raw MIME
    spam_score: formData.get('spam_score') as string,
    spam_report: formData.get('spam_report') as string,
  }
}

// Generate conversation ID
function generateConversationId(contactEmail: string, senderEmail: string): string {
  const participants = [contactEmail, senderEmail].sort().join('|')
  return Buffer.from(participants).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 SendGrid webhook received')
    
    // Parse the form data
    const emailData = await parseFormData(request)
    
    // Extract email addresses
    const fromEmail = emailData.envelope.from || emailData.from.match(/<([^>]+)>/)?.[1] || emailData.from
    const toEmail = emailData.envelope.to?.[0] || emailData.to.match(/<([^>]+)>/)?.[1] || emailData.to
    
    console.log(`📧 Email from ${fromEmail} to ${toEmail}`)
    
    // Find the campaign sender this email is responding to
    const { data: campaignSender } = await supabaseServer
      .from('campaign_senders')
      .select('user_id, campaign_id')
      .eq('email', toEmail.toLowerCase())
      .single()
    
    if (!campaignSender) {
      console.log('❌ No campaign sender found for:', toEmail)
      return NextResponse.json({ success: true, message: 'Not a campaign email' })
    }
    
    // Generate conversation ID
    const conversationId = generateConversationId(fromEmail, toEmail)
    
    // Store the message
    const { data: message, error } = await supabaseServer
      .from('inbox_messages')
      .insert({
        user_id: campaignSender.user_id,
        message_id: `sendgrid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conversationId,
        campaign_id: campaignSender.campaign_id,
        contact_email: fromEmail.toLowerCase(),
        sender_email: toEmail.toLowerCase(),
        subject: emailData.subject,
        body_text: emailData.text || '',
        body_html: emailData.html || '',
        direction: 'inbound',
        channel: 'email',
        status: 'unread',
        folder: 'inbox',
        provider: 'sendgrid',
        provider_data: {
          spam_score: emailData.spam_score,
          spam_report: emailData.spam_report,
          envelope: emailData.envelope
        },
        sent_at: new Date().toISOString(),
        received_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error storing message:', error)
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
    }
    
    console.log(`✅ Message stored: ${message.id}`)
    
    // Update thread
    await supabaseServer
      .from('inbox_threads')
      .upsert({
        user_id: campaignSender.user_id,
        conversation_id: conversationId,
        campaign_id: campaignSender.campaign_id,
        contact_email: fromEmail.toLowerCase(),
        subject: emailData.subject,
        last_message_at: new Date().toISOString(),
        last_message_preview: (emailData.text || '').substring(0, 150),
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })
    
    return NextResponse.json({ 
      success: true,
      messageId: message.id,
      conversationId 
    })
    
  } catch (error) {
    console.error('❌ SendGrid webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Step 5: Update Environment Variables

Add to `.env.local`:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_WEBHOOK_PUBLIC_KEY=your-webhook-public-key
SENDGRID_PARSE_DOMAIN=reply.example.com
```

---

## Step 6: Test Your Setup

### Test 1: DNS Verification
```bash
# Check MX records
dig MX reply.example.com

# Should return:
# reply.example.com. 300 IN MX 10 mx.sendgrid.net
```

### Test 2: Send Test Email
1. Send an email to: `test@reply.example.com`
2. Check your webhook logs
3. Verify message appears in database

### Test 3: Monitor Incoming Emails
```bash
node scripts/monitor-real-response.js
```

---

## Step 7: Production Deployment

### Deploy to Vercel:
```bash
vercel --prod
```

### Update SendGrid webhook URL:
1. Go to SendGrid → Settings → Inbound Parse
2. Update URL to: `https://your-production-domain.com/api/webhooks/sendgrid`

### Add webhook authentication:
```typescript
// Add to webhook handler
const signature = request.headers.get('X-Twilio-Email-Event-Webhook-Signature')
const timestamp = request.headers.get('X-Twilio-Email-Event-Webhook-Timestamp')

// Verify signature (see SendGrid docs for implementation)
```

---

## 📊 Monitoring & Debugging

### Check SendGrid Activity:
1. SendGrid Dashboard → Activity
2. View all inbound emails
3. Check processing status

### Debug webhook issues:
```bash
# View Next.js logs
npm run dev

# Test webhook manually
curl -X POST http://localhost:3000/api/webhooks/sendgrid \
  -F "from=test@example.com" \
  -F "to=campaign@reply.example.com" \
  -F "subject=Test Email" \
  -F "text=This is a test" \
  -F 'envelope={"from":"test@example.com","to":["campaign@reply.example.com"]}'
```

### Common Issues:

**DNS not propagating:**
- Wait 1-4 hours for DNS changes
- Use different DNS server: `dig @8.8.8.8 MX reply.example.com`

**Emails not arriving:**
- Check spam folder
- Verify MX records
- Check SendGrid activity feed

**Webhook not firing:**
- Verify URL is publicly accessible
- Check for HTTPS certificate issues
- Review SendGrid error logs

---

## 🎯 Success Checklist

- [ ] SendGrid account created
- [ ] DNS MX records configured
- [ ] Inbound Parse webhook configured
- [ ] Webhook handler deployed
- [ ] Test email successfully captured
- [ ] Message appears in LeadsUp inbox
- [ ] Badge counts update correctly
- [ ] Threading works properly

---

## 💡 Pro Tips

1. **Use subdomain** (`reply.example.com`) instead of root domain
2. **Set up SPF/DKIM** for better deliverability
3. **Monitor spam scores** to improve email quality
4. **Use webhooks.site** to debug webhook payloads
5. **Set up alerts** for failed webhook deliveries

---

## 🔗 Resources

- [SendGrid Inbound Parse Docs](https://docs.sendgrid.com/for-developers/parsing-email/inbound-email)
- [SendGrid Webhook Security](https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features)
- [DNS Checker Tool](https://mxtoolbox.com/)
- [Webhook Testing Tool](https://webhook.site/)

---

## Need Help?

If you encounter issues:
1. Check SendGrid Activity Feed
2. Review webhook logs in your app
3. Test with `node scripts/test-webhook-setup.js`
4. Contact SendGrid support (they're very helpful!)