# Production Warmup Setup Guide

## 🚀 Running Warmup in Production with Cron Jobs

### Option 1: Server Cron Jobs (Recommended)

#### Setup Cron Jobs on your production server:

```bash
# Edit crontab
crontab -e

# Add these lines for automated warmup execution:

# Run warmup scheduler every 15 minutes (creates new activities)
*/15 * * * * curl -X GET "https://yourdomain.com/api/warming/scheduler" >/dev/null 2>&1

# Run warmup executor every 5 minutes (sends emails)
*/5 * * * * curl -X GET "https://yourdomain.com/api/warming/execute" >/dev/null 2>&1

# Daily health check at 8 AM
0 8 * * * curl -X GET "https://yourdomain.com/api/warming/scheduler" && echo "Daily warmup check completed" | mail -s "Warmup Status" your-email@domain.com
```

#### Alternative with logging:
```bash
# With detailed logging for debugging
*/15 * * * * curl -X GET "https://yourdomain.com/api/warming/scheduler" >> /var/log/warmup-scheduler.log 2>&1
*/5 * * * * curl -X GET "https://yourdomain.com/api/warming/execute" >> /var/log/warmup-executor.log 2>&1
```

### Option 2: Vercel Cron (if using Vercel)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/warming/scheduler",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/warming/execute", 
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Option 3: GitHub Actions (Free CI/CD)

Create `.github/workflows/warmup-cron.yml`:

```yaml
name: Warmup Cron Jobs

on:
  schedule:
    # Run scheduler every 15 minutes
    - cron: '*/15 * * * *'
    # Run executor every 5 minutes  
    - cron: '*/5 * * * *'
  workflow_dispatch: # Manual trigger

jobs:
  warmup-scheduler:
    if: github.event.schedule == '*/15 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Warmup Scheduler
        run: |
          curl -X GET "${{ secrets.PRODUCTION_URL }}/api/warming/scheduler"

  warmup-executor:
    if: github.event.schedule == '*/5 * * * *'
    runs-on: ubuntu-latest  
    steps:
      - name: Trigger Warmup Executor
        run: |
          curl -X GET "${{ secrets.PRODUCTION_URL }}/api/warming/execute"
```

### Option 4: External Monitoring Services

#### Using UptimeRobot (Free):
1. Sign up at https://uptimerobot.com
2. Add HTTP(s) monitors:
   - `https://yourdomain.com/api/warming/scheduler` (every 15 minutes)
   - `https://yourdomain.com/api/warming/execute` (every 5 minutes)

#### Using Pingdom or similar:
- Set up health checks that call your warmup endpoints

### 🔧 Production Environment Setup

#### 1. Environment Variables
Ensure these are set in production:

```bash
# Required for live email sending
EMAIL_SIMULATION_MODE=false
SENDGRID_API_KEY=your_actual_sendgrid_key

# Database connection
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

#### 2. Health Monitoring

Create a monitoring endpoint - `pages/api/warmup/health.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Check active warmup campaigns
    const { data: campaigns, error } = await supabase
      .from('warmup_campaigns')
      .select('id, sender_email, emails_sent_today, daily_target')
      .eq('status', 'active')
    
    if (error) throw error
    
    // Check recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { data: recentActivity } = await supabase
      .from('warmup_activities')
      .select('id')
      .gte('executed_at', yesterday.toISOString())
      .eq('success', true)
    
    return NextResponse.json({
      status: 'healthy',
      activeCampaigns: campaigns?.length || 0,
      recentSuccessfulActivities: recentActivity?.length || 0,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
```

### 📊 Monitoring & Alerts

#### 1. Set up alerts for failed warmup executions:
```bash
# Add to your cron job for email alerts on failures
*/5 * * * * curl -f "https://yourdomain.com/api/warming/execute" || echo "Warmup failed at $(date)" | mail -s "ALERT: Warmup Failed" admin@yourdomain.com
```

#### 2. Daily summary report:
```bash
# Daily warmup summary at 9 PM
0 21 * * * curl "https://yourdomain.com/api/warmup/health" | mail -s "Daily Warmup Report" admin@yourdomain.com
```

### 🚨 Important Production Notes

1. **SendGrid Credits**: Monitor your SendGrid usage to avoid hitting limits
2. **Rate Limits**: The current setup sends emails throughout the day to avoid spam filters
3. **Logging**: Monitor your application logs for any warmup failures
4. **Backup**: Keep your recipient list backed up
5. **Gradual Scaling**: Start with Phase 1 (5 emails/day) and let the system auto-scale

### 🔄 Manual Operations

#### Force run warmup:
```bash
# Manually trigger scheduler and executor
curl -X GET "https://yourdomain.com/api/warming/scheduler"
curl -X GET "https://yourdomain.com/api/warming/execute"
```

#### Check warmup status:
```bash
curl -X GET "https://yourdomain.com/api/warmup/health"
```

Your warmup system is now production-ready! 🎉