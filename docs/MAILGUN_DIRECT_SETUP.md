# Mailgun Direct Setup - No N8N Needed!

## Why Direct Mailgun?
- ✅ Your webhook code is already built
- ✅ Faster (no middleman)
- ✅ Simpler architecture
- ✅ Direct email → database
- ✅ 1000 emails free/month

---

## Step 1: Sign Up for Mailgun

1. Go to: https://signup.mailgun.com/
2. Create account (free tier: 1000 emails/month)
3. Verify your account

---

## Step 2: Add and Verify Domain

1. **Go to Domains** in Mailgun dashboard
2. **Add Domain**: `reply.yourdomain.com`
3. **Add DNS Records** (copy from Mailgun):
   ```
   Type: MX
   Host: reply
   Priority: 10
   Value: mxa.mailgun.org

   Type: MX  
   Host: reply
   Priority: 10
   Value: mxb.mailgun.org

   Type: TXT
   Host: reply
   Value: v=spf1 include:mailgun.org ~all

   Type: TXT
   Host: krs._domainkey.reply
   Value: (DKIM key from Mailgun)

   Type: CNAME
   Host: email.reply
   Value: mailgun.org
   ```

4. **Wait for verification** (can take up to 24 hours)

---

## Step 3: Create Inbound Route

1. **Go to Receiving → Routes**
2. **Create Route**:
   ```
   Priority: 10
   Expression: match_recipient(".*@reply.yourdomain.com")
   Actions: forward("https://your-app.com/api/webhooks/smtp")
   Description: LeadsUp Email Capture
   ```
3. **Save Route**

---

## Step 4: Update Your Webhook

Your existing webhook at `/api/webhooks/smtp/route.ts` needs small updates for Mailgun format:

```typescript
// Add Mailgun signature verification
function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
  if (!key) return false
  
  const hmac = crypto.createHmac('sha256', key)
  hmac.update(timestamp + token)
  return hmac.digest('hex') === signature
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Mailgun webhook received')
    
    const formData = await request.formData()
    
    // Mailgun sends form data, not JSON
    const emailData = {
      from: formData.get('sender') as string,
      to: formData.get('recipient') as string,  
      subject: formData.get('subject') as string,
      textBody: formData.get('body-plain') as string,
      htmlBody: formData.get('body-html') as string,
      messageId: formData.get('Message-Id') as string,
      timestamp: formData.get('timestamp') as string,
      token: formData.get('token') as string,
      signature: formData.get('signature') as string
    }
    
    // Verify signature (optional but recommended)
    if (!verifyMailgunSignature(emailData.timestamp, emailData.token, emailData.signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // Rest of your existing webhook logic...
    // (The processing code you already have works perfectly!)
    
  } catch (error) {
    console.error('❌ Mailgun webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Step 5: Environment Variables

Add to `.env.local`:
```bash
# Mailgun Configuration
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-signing-key
MAILGUN_DOMAIN=reply.yourdomain.com
WEBHOOK_DOMAIN=https://your-app.com
```

---

## Step 6: Test the Setup

### Test 1: Send Email
```bash
# Send test email to: test@reply.yourdomain.com
```

### Test 2: Check Mailgun Logs
```bash
# Go to Mailgun Dashboard → Logs
# See if email was received and forwarded
```

### Test 3: Monitor Your App  
```bash
node scripts/monitor-real-response.js
```

---

## Troubleshooting

### DNS Issues:
```bash
# Check MX records
dig MX reply.yourdomain.com

# Should show:
# reply.yourdomain.com. IN MX 10 mxa.mailgun.org
# reply.yourdomain.com. IN MX 10 mxb.mailgun.org
```

### Route Issues:
- Check route expression matches your domain
- Verify webhook URL is publicly accessible  
- Check Mailgun logs for delivery attempts

### Webhook Issues:
- Check your app logs
- Verify webhook endpoint is working: `GET /api/webhooks/smtp`
- Test locally with ngrok

---

## Success Checklist

- [ ] Mailgun account created
- [ ] Domain added and verified
- [ ] DNS records configured  
- [ ] Inbound route created
- [ ] Webhook updated for Mailgun format
- [ ] Test email sent and received
- [ ] Email appears in LeadsUp inbox

---

## Why This is Better Than N8N

1. **Simpler**: Email → Mailgun → Your App → Database
2. **Faster**: No extra processing hop
3. **Cheaper**: No N8N hosting costs
4. **More reliable**: Fewer moving parts
5. **Already built**: Your webhook code exists

---

## Production Deployment

1. **Deploy your app** to production server
2. **Update Mailgun route** with production URL
3. **Configure HTTPS** (required for webhooks)
4. **Set environment variables**
5. **Monitor with logs**

That's it! Direct email capture without N8N complexity.