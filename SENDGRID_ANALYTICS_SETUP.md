# SendGrid Analytics Setup Guide

This guide walks you through setting up real-time SendGrid analytics for campaign statistics including sent, delivered, bounced, blocked, unique opens, clicks, and more.

## 🎯 Features Implemented

- **Real-time Event Processing**: Ingests SendGrid events via webhook
- **Comprehensive Metrics**: Tracks sent, delivered, bounced, blocked, opens, clicks, unsubscribes
- **Deduplication**: Prevents duplicate event processing
- **Campaign-level Analytics**: Detailed metrics per campaign with date filtering
- **User-level Dashboard**: Aggregated performance across all campaigns
- **Near Real-time Updates**: ~1-2 minute delay for metric updates
- **Rate Calculations**: Delivery rate, bounce rate, open rate, click rate, unsubscribe rate

## 📋 Prerequisites

1. SendGrid account with email sending configured
2. PostgreSQL database (Supabase recommended)
3. Next.js application with the provided code

## 🚀 Setup Instructions

### Step 1: Database Setup

1. Run the database migration scripts in order:

```bash
# Create the analytics tables and triggers
psql -f scripts/create-sendgrid-analytics-tables.sql

# Create the analytics functions
psql -f scripts/create-sendgrid-analytics-functions.sql
```

2. Verify tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%sendgrid%' OR table_name LIKE '%email_tracking%';
```

### Step 2: Environment Configuration

Add the following environment variables to your `.env.local`:

```bash
# SendGrid Webhook Secret (generate a random string)
SENDGRID_WEBHOOK_SECRET=your_webhook_secret_here

# Your application base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Step 3: SendGrid Webhook Configuration

1. **Log into SendGrid Console**
   - Go to Settings → Mail Settings → Event Webhook

2. **Configure the Webhook**
   - **HTTP Post URL**: `https://your-domain.com/api/sendgrid/webhook`
   - **Select Events**: 
     - ✅ Processed
     - ✅ Delivered  
     - ✅ Deferred
     - ✅ Bounce
     - ✅ Blocked
     - ✅ Opened
     - ✅ Clicked
     - ✅ Unsubscribe
     - ✅ Group Unsubscribe
     - ✅ Spam Report

3. **Security Settings**
   - ✅ Enable Signed Event Webhook
   - Use the same secret from your environment variable

4. **Test the Webhook**
   - Use the "Test Your Integration" button in SendGrid
   - Check your application logs for successful event processing

### Step 4: Campaign Tagging (Important!)

To link emails to campaigns and users, you need to tag your emails. Add categories when sending emails:

```javascript
// When sending emails via SendGrid API
const msg = {
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'Your Subject',
  text: 'Email content',
  // Add these categories for tracking
  categories: [
    `campaign_${campaignId}`,  // Links to specific campaign
    `user_${userId}`           // Links to specific user
  ]
}
```

### Step 5: Frontend Integration

The analytics are automatically integrated into:

1. **Campaign Analytics Page** (`/components/campaign-analytics.tsx`)
   - Real SendGrid metrics instead of placeholder data
   - Date range filtering
   - Delivery, open, click, and bounce rates

2. **Dashboard** (`/components/comprehensive-dashboard.tsx`)
   - User-level aggregated metrics
   - Performance overview cards
   - Real-time statistics

## 🧪 Testing

Run the test script to verify everything is working:

```bash
node scripts/test-sendgrid-analytics.js
```

This will test:
- ✅ Webhook endpoint health
- ✅ Event processing
- ✅ Analytics API endpoints
- ✅ Database connectivity

## 📊 API Endpoints

### Campaign Analytics
```http
GET /api/analytics/campaign?campaign_id={id}&start_date={date}&end_date={date}
```

### User Analytics  
```http
GET /api/analytics/user?start_date={date}&end_date={date}
```

### Metric Recalculation
```http
POST /api/analytics/user
Content-Type: application/json

{
  "campaignId": "optional_campaign_id",
  "date": "2024-01-01"
}
```

## 🔧 Troubleshooting

### No Events Received
1. Check webhook URL is correct and accessible
2. Verify SENDGRID_WEBHOOK_SECRET matches SendGrid configuration
3. Check SendGrid webhook logs for delivery errors
4. Ensure your server accepts POST requests on the webhook endpoint

### Events Processed But No Campaign Data
1. Verify emails are being sent with proper categories:
   - `campaign_{campaignId}`
   - `user_{userId}`
2. Check that campaign exists in the campaigns table
3. Verify user authentication is working

### Metrics Not Updating
1. Check database triggers are created correctly
2. Verify campaign_metrics and user_metrics tables exist
3. Run manual recalculation:
   ```sql
   SELECT recalculate_unique_metrics('campaign_id', 'date');
   SELECT aggregate_user_metrics('user_id', 'date');
   ```

### Performance Issues
1. Ensure database indexes are created (included in migration)
2. Consider archiving old events after 90 days
3. Monitor webhook processing performance

## 🔒 Security Considerations

1. **Webhook Signature Verification**: Always enabled in production
2. **Rate Limiting**: Consider adding rate limits to webhook endpoint
3. **Data Privacy**: Events contain email addresses - handle per GDPR/privacy laws
4. **Access Control**: Analytics endpoints require user authentication

## 📈 Monitoring

Monitor the following:

1. **Webhook Health**: `GET /api/sendgrid/webhook` should return healthy status
2. **Event Processing Rate**: Check SendGrid events table growth
3. **Database Performance**: Monitor query performance on analytics tables
4. **Error Rates**: Check application logs for webhook processing errors

## 🚀 Production Deployment

1. **Database**: Ensure production database has all migrations applied
2. **Environment**: Set production environment variables
3. **SendGrid**: Update webhook URL to production domain
4. **SSL**: Ensure webhook endpoint uses HTTPS
5. **Monitoring**: Set up alerts for webhook failures

## 📝 Data Schema

### Key Tables Created

- `sendgrid_events`: Raw webhook events from SendGrid
- `email_tracking`: Individual email status tracking
- `campaign_metrics`: Daily aggregated campaign metrics  
- `user_metrics`: Daily aggregated user metrics

### Available Metrics

- Emails Sent/Delivered/Bounced/Blocked
- Unique Opens/Clicks vs Total Opens/Clicks
- Unsubscribes and Spam Reports
- Calculated Rates (Delivery, Bounce, Open, Click, Unsubscribe)
- Time-series data for charts and trends

## 🎉 Success!

Once configured, you'll have:
- Real-time campaign analytics with ~1-2 minute delay
- Accurate delivery and engagement metrics
- Historical data with date range filtering
- User and campaign-level insights
- Automated metric calculations and aggregations

Your SendGrid analytics are now ready for production use!