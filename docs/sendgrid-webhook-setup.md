# SendGrid Webhook Setup for Real Health Score Tracking

This guide explains how to set up SendGrid webhooks to track real email events for accurate health score calculation.

## Overview

The health score system now supports two modes:
1. **Real Data Mode**: Uses actual SendGrid webhook events (recommended)
2. **Fallback Mode**: Uses simulated data based on account age (backup)

## Webhook Endpoints

### Event Webhook (for health scores)
- **URL**: `https://your-domain.com/api/webhooks/sendgrid/events`
- **Purpose**: Receives outbound email events for health score calculation
- **Events**: processed, delivered, bounce, block, open, click, unsubscribe, spam_report

### Inbound Parse Webhook (existing)
- **URL**: `https://your-domain.com/api/webhooks/sendgrid`
- **Purpose**: Receives inbound email replies
- **Already configured**

## SendGrid Configuration Steps

### 1. Configure Event Webhook in SendGrid

1. Log into [SendGrid Console](https://app.sendgrid.com)
2. Go to **Settings** > **Mail Settings** > **Event Webhook**
3. Set the HTTP POST URL to: `https://your-domain.com/api/webhooks/sendgrid/events`
4. Select these events:
   - ✅ Processed
   - ✅ Delivered
   - ✅ Bounce
   - ✅ Blocked
   - ✅ Open
   - ✅ Click
   - ✅ Unsubscribe
   - ✅ Group Unsubscribe
   - ✅ Spam Report
5. **Important**: In the webhook settings, make sure to pass custom data:
   - Add `user_id` to unique args
   - Add `campaign_id` to unique args  
   - Add `sender_email` to unique args

### 2. Set Up Signature Verification (Recommended)

1. In SendGrid, go to **Settings** > **Mail Settings** > **Event Webhook**
2. Enable **Signed Event Webhook**
3. Copy the **Verification Key**
4. Add it to your environment variables:
   ```bash
   SENDGRID_WEBHOOK_PUBLIC_KEY=your_verification_key_here
   ```

### 3. Configure Your Email Sending

When sending emails through SendGrid, include custom data for tracking:

```javascript
const msg = {
  to: recipient.email,
  from: senderEmail,
  subject: 'Your Subject',
  html: 'Your HTML content',
  // Critical: Add custom tracking data
  custom_args: {
    user_id: userId,
    campaign_id: campaignId,
    sender_email: senderEmail
  },
  // Alternative: Use categories
  categories: [
    `user_${userId}`,
    `campaign_${campaignId}`,
    senderEmail
  ]
}

await sgMail.send(msg)
```

## Database Schema

The system automatically creates these tables:

### 1. `sendgrid_events` (Raw Events)
Stores every webhook event received from SendGrid.

### 2. `sender_metrics` (Daily Aggregations)
Aggregates events by sender and date for performance.

### 3. `sender_summary_metrics` (Rolling Summaries)
Pre-calculated rolling metrics for 7, 30, and 90-day periods.

## Health Score Calculation

### Real Data Metrics:
- **Warmup Score (25%)**: Based on account age and sending activity
- **Deliverability Score (30%)**: Real bounce and block rates from webhooks
- **Engagement Score (25%)**: Real open, click, and reply rates
- **Volume Score (10%)**: Actual sending consistency and volume
- **Reputation Score (10%)**: Account age + spam/unsubscribe rates

### Fallback Metrics:
If no webhook data is available, the system estimates metrics based on:
- Account creation date
- Inferred warmup status
- Conservative assumptions about performance

## Testing the Integration

### 1. Health Check
Test the webhook endpoint:
```bash
curl https://your-domain.com/api/webhooks/sendgrid/events
```

Should return:
```json
{
  "success": true,
  "message": "SendGrid events webhook endpoint is healthy",
  "endpoint": "/api/webhooks/sendgrid/events"
}
```

### 2. Test Event Processing
Send a test email through SendGrid and verify:

1. Check webhook receives events:
```sql
SELECT * FROM sendgrid_events 
WHERE user_id = 'your_user_id' 
ORDER BY timestamp DESC LIMIT 10;
```

2. Check sender metrics are updated:
```sql
SELECT * FROM sender_metrics 
WHERE sender_email = 'your_sender@domain.com'
ORDER BY date DESC LIMIT 5;
```

3. Verify health scores use real data:
```bash
curl https://your-domain.com/api/sender-accounts/health-score?senderIds=sender_id_1
```

Look for `"dataSource": "webhook"` in the response.

## Monitoring

### 1. Check Data Source
The health score API response includes a `dataSource` field:
- `"webhook"`: Using real SendGrid data ✅
- `"simulated"`: Using fallback simulated data ⚠️

### 2. Database Health
Monitor these queries:

```sql
-- Check webhook events are being received
SELECT 
  DATE(timestamp) as date,
  event_type,
  COUNT(*) as count
FROM sendgrid_events 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), event_type
ORDER BY date DESC;

-- Check sender metrics are updating
SELECT 
  sender_email,
  date,
  emails_sent,
  emails_delivered,
  delivery_rate
FROM sender_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, sender_email;
```

### 3. Health Score Accuracy
Compare health scores before and after webhook setup:
- Inactive accounts should show lower scores
- Active accounts with good metrics should show higher scores
- Scores should reflect real performance patterns

## Troubleshooting

### Issue: Health scores still show simulated data
**Solution**: Check that:
1. Webhook is receiving events (`sendgrid_events` table has data)
2. Events include `user_id`, `campaign_id`, `sender_email` in custom args
3. Sender accounts exist in `sender_accounts` table

### Issue: Webhook signature verification fails
**Solution**: 
1. Ensure `SENDGRID_WEBHOOK_PUBLIC_KEY` is set correctly
2. Check that SendGrid webhook is configured with signature
3. For testing, you can disable verification (not recommended for production)

### Issue: No metrics being calculated
**Solution**:
1. Run the database migration: `scripts/create-sender-metrics-table.sql`
2. Check that triggers are active on `sendgrid_events` table
3. Manually trigger metrics calculation:
   ```sql
   SELECT calculate_sender_summary_metrics('user_id', 'sender@email.com', 30);
   ```

## Performance Optimization

### 1. Regular Metrics Calculation
Set up a cron job to recalculate summary metrics:

```bash
# Run daily at 2 AM
0 2 * * * /path/to/calculate-metrics.sh
```

### 2. Data Retention
Consider archiving old events:

```sql
-- Archive events older than 90 days
DELETE FROM sendgrid_events 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

### 3. Index Optimization
Ensure these indexes exist (already created by migration):

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sendgrid_events_user_sender 
ON sendgrid_events(user_id, event_data->>'sender_email');

CREATE INDEX IF NOT EXISTS idx_sender_metrics_lookup 
ON sender_metrics(user_id, sender_email, date);
```

## Security Considerations

1. **Always use HTTPS** for webhook URLs
2. **Enable signature verification** in production
3. **Validate webhook data** before processing
4. **Rate limit** webhook endpoints if needed
5. **Monitor for anomalous** webhook traffic

## Success Metrics

After setup, you should see:
- ✅ Real bounce rates instead of estimated 1-2%
- ✅ Actual open rates instead of assumed 25-28%
- ✅ True sending volumes instead of calculated estimates
- ✅ Accurate engagement metrics from real user behavior
- ✅ Health scores that reflect actual sender performance

This provides much more accurate health assessments for your email accounts!