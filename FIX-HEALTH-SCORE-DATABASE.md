# 🔧 Fix Health Score Database Issue

## Problem
The health score calculation is failing because the `sender_metrics` table doesn't exist in your database.

**Error:** `Could not find the table 'public.sender_metrics' in the schema cache`

## Quick Fix

### Step 1: Run the Database Migration

Go to your **Supabase SQL Editor** and run this SQL:

```sql
-- ============================================
-- SENDER METRICS AGGREGATION TABLE
-- ============================================

-- Table for sender-level aggregated metrics (real-time from webhook events)
CREATE TABLE IF NOT EXISTS sender_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  sender_email TEXT NOT NULL, -- The actual sending email address
  
  -- Date for daily aggregations
  date DATE NOT NULL,
  
  -- Core delivery metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  emails_deferred INTEGER DEFAULT 0,
  
  -- Engagement metrics
  unique_opens INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  
  -- Negative metrics
  unsubscribes INTEGER DEFAULT 0,
  spam_reports INTEGER DEFAULT 0,
  
  -- Calculated rates (stored for performance)
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  reply_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  spam_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Health score components (calculated from metrics)
  warmup_score INTEGER DEFAULT 0,
  deliverability_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  volume_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  overall_health_score INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metrics per sender per date
  UNIQUE(user_id, sender_email, date)
);

-- ============================================
-- SENDER SUMMARY METRICS TABLE (ROLLING)
-- ============================================

-- Table for sender-level rolling metrics (last 30/90 days for health calculation)
CREATE TABLE IF NOT EXISTS sender_summary_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_account_id TEXT, -- Reference to sender_accounts.id if available
  
  -- Rolling periods
  period_days INTEGER NOT NULL CHECK (period_days IN (7, 30, 90)),
  
  -- Core delivery metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  
  -- Engagement metrics
  unique_opens INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  unique_replies INTEGER DEFAULT 0,
  
  -- Negative metrics
  unsubscribes INTEGER DEFAULT 0,
  spam_reports INTEGER DEFAULT 0,
  
  -- Calculated rates
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  reply_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Health score breakdown
  warmup_score INTEGER DEFAULT 0,
  deliverability_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  volume_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  overall_health_score INTEGER DEFAULT 0,
  
  -- Account metadata for health calculation
  account_age_days INTEGER DEFAULT 0,
  warmup_status TEXT DEFAULT 'unknown',
  sending_days_active INTEGER DEFAULT 0,
  avg_daily_volume DECIMAL(8,2) DEFAULT 0.00,
  
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metrics per sender per period
  UNIQUE(user_id, sender_email, period_days)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Sender metrics indexes
CREATE INDEX IF NOT EXISTS idx_sender_metrics_user_id ON sender_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_sender_email ON sender_metrics(sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_date ON sender_metrics(date);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_user_sender ON sender_metrics(user_id, sender_email);

-- Sender summary metrics indexes
CREATE INDEX IF NOT EXISTS idx_sender_summary_user_id ON sender_summary_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_summary_sender_email ON sender_summary_metrics(sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_summary_period ON sender_summary_metrics(period_days);
CREATE INDEX IF NOT EXISTS idx_sender_summary_user_sender ON sender_summary_metrics(user_id, sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_summary_account_id ON sender_summary_metrics(sender_account_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE sender_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sender_summary_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for now - adjust as needed)
CREATE POLICY "Allow all operations" ON sender_metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sender_summary_metrics FOR ALL USING (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Sender metrics tables created successfully! 📊' as status;
```

### Step 2: Verify the Fix

After running the SQL, test your health scores:

1. **Refresh your application**
2. **Check health scores** - they should now calculate without errors
3. **Look for this in logs:** Health scores will show as "real data" mode instead of "fallback mode"

### Step 3: Enable Real SendGrid Data (Optional)

To get **real email performance data** instead of simulated data:

1. **Configure SendGrid Webhook:**
   - URL: `https://your-domain.com/api/webhooks/sendgrid/events`
   - Events: processed, delivered, bounce, block, open, click, unsubscribe, spam

2. **Add to your email sending code:**
   ```javascript
   unique_args: {
     user_id: userId,
     campaign_id: campaignId,
     sender_email: senderEmail
   }
   ```

## Expected Results After Fix

✅ **Health score errors will disappear**  
✅ **Health scores will calculate properly**  
✅ **No more "Could not find table" errors**  
✅ **System will work with both simulated and real data**

## What This Does

- Creates `sender_metrics` table for daily email statistics per sender
- Creates `sender_summary_metrics` table for rolling period summaries  
- Adds indexes for fast queries
- Enables the real health score calculation system
- Provides fallback to simulated data when no real webhook data exists

Your health scores should work immediately after running this SQL! 🎉