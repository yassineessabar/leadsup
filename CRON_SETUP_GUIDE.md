# Campaign Automation Cron Job Setup Guide

## Overview

The campaign automation system requires a cron job to automatically process pending campaigns and send scheduled messages. This guide covers setup for different environments.

## Local Development Setup

### 1. macOS/Linux Local Setup

#### Option A: Using System Crontab (Recommended for Development)

```bash
# Open crontab editor
crontab -e

# Add the following line (runs every 15 minutes)
*/15 * * * * cd /Users/yassineessabar/Documents/GitHub/loopdev && /usr/local/bin/node scripts/process-campaign-automation.js >> /tmp/campaign-automation.log 2>&1

# Or for testing every minute during development
* * * * * cd /Users/yassineessabar/Documents/GitHub/loopdev && /usr/local/bin/node scripts/process-campaign-automation.js --test >> /tmp/campaign-automation.log 2>&1
```

#### Option B: Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'campaign-automation',
    script: 'scripts/process-campaign-automation.js',
    cwd: '/Users/yassineessabar/Documents/GitHub/loopdev',
    instances: 1,
    autorestart: false,
    watch: false,
    cron_restart: '*/15 * * * *', // Every 15 minutes
    env: {
      NODE_ENV: 'development'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. Windows Local Setup

#### Using Task Scheduler

```powershell
# Create a batch file first
echo @echo off > campaign-automation.bat
echo cd /d "C:\path\to\your\project\loopdev" >> campaign-automation.bat
echo node scripts/process-campaign-automation.js >> campaign-automation.bat

# Then create scheduled task
schtasks /create /tn "CampaignAutomation" /tr "C:\path\to\campaign-automation.bat" /sc minute /mo 15 /ru SYSTEM
```

## Production Server Setup

### 1. Ubuntu/Debian Server

#### Using System Crontab

```bash
# Switch to your application user
sudo su - appuser

# Open crontab
crontab -e

# Add production cron job (every 15 minutes)
*/15 * * * * cd /var/www/loopdev && /usr/bin/node scripts/process-campaign-automation.js >> /var/log/campaign-automation.log 2>&1

# Create log rotation
sudo tee /etc/logrotate.d/campaign-automation << 'EOF'
/var/log/campaign-automation.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 appuser appuser
}
EOF
```

### 2. Docker Environment

#### Create Dockerfile.cron

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY scripts/ ./scripts/
COPY .env* ./

# Install cron
RUN apk add --no-cache dcron

# Create cron file
RUN echo "*/15 * * * * cd /app && node scripts/process-campaign-automation.js >> /var/log/cron.log 2>&1" > /etc/crontabs/root

# Start cron daemon
CMD ["crond", "-f", "-d", "8"]
```

#### Docker Compose with Cron

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    
  campaign-automation:
    build:
      context: .
      dockerfile: Dockerfile.cron
    depends_on:
      - app
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BASE_URL=http://app:3000
    volumes:
      - ./logs:/var/log
```

### 3. Heroku Deployment

#### Using Heroku Scheduler

```bash
# Install Heroku Scheduler addon
heroku addons:create scheduler:standard

# Open scheduler dashboard
heroku addons:open scheduler

# Add job in Heroku dashboard:
# Command: node scripts/process-campaign-automation.js
# Frequency: Every 10 minutes
```

#### Or use Procfile with worker

```procfile
web: npm start
worker: node scripts/process-campaign-automation.js
scheduler: while true; do sleep 900; node scripts/process-campaign-automation.js; done
```

### 4. Vercel Deployment

#### Using Vercel Cron Jobs

```javascript
// api/cron/campaign-automation.js
export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Import and run automation logic
    const { processAutomation } = await import('../../scripts/automation-logic');
    const result = await processAutomation();
    
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/campaign-automation",
    "schedule": "*/15 * * * *"
  }]
}
```

## Environment Variables Setup

### Required Environment Variables

```bash
# .env.local or .env.production
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
FROM_EMAIL=noreply@yourdomain.com
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing Cron Setup

### 1. Test Script Manually

```bash
# Test in development mode
cd /Users/yassineessabar/Documents/GitHub/loopdev
node scripts/process-campaign-automation.js --test

# Test in production mode (actually sends messages)
node scripts/process-campaign-automation.js
```

### 2. Verify Cron Installation

```bash
# Check if cron job is installed
crontab -l

# Check cron service status (Linux)
sudo systemctl status cron

# Check cron logs
tail -f /var/log/cron
tail -f /tmp/campaign-automation.log
```

### 3. Monitor Automation

```bash
# Create monitoring script
cat > monitor-automation.sh << 'EOF'
#!/bin/bash
echo "=== Campaign Automation Monitor ==="
echo "Last cron run: $(tail -1 /tmp/campaign-automation.log | head -1)"
echo "Cron job status: $(ps aux | grep -v grep | grep process-campaign-automation | wc -l) running"
echo "Next cron execution: $(crontab -l | grep campaign-automation)"
EOF

chmod +x monitor-automation.sh
./monitor-automation.sh
```

## Quick Start Commands

### For Local Development (macOS)

```bash
# 1. Find your Node.js path
which node

# 2. Add to crontab (replace paths as needed)
(crontab -l 2>/dev/null; echo "*/15 * * * * cd /Users/yassineessabar/Documents/GitHub/loopdev && /usr/local/bin/node scripts/process-campaign-automation.js --test >> /tmp/campaign-automation.log 2>&1") | crontab -

# 3. Verify installation
crontab -l

# 4. Watch logs
tail -f /tmp/campaign-automation.log
```

### For Production Server

```bash
# 1. Switch to app user
sudo su - appuser

# 2. Install cron job
(crontab -l 2>/dev/null; echo "*/15 * * * * cd /var/www/loopdev && /usr/bin/node scripts/process-campaign-automation.js >> /var/log/campaign-automation.log 2>&1") | crontab -

# 3. Start cron service
sudo systemctl enable cron
sudo systemctl start cron

# 4. Monitor
tail -f /var/log/campaign-automation.log
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x scripts/process-campaign-automation.js
   ```

2. **Node.js Not Found**
   ```bash
   # Use full path to node
   /usr/local/bin/node scripts/process-campaign-automation.js
   ```

3. **Environment Variables Not Loaded**
   ```bash
   # Source environment in cron
   */15 * * * * cd /path/to/project && source .env && node scripts/process-campaign-automation.js
   ```

4. **Database Connection Issues**
   ```bash
   # Test database connectivity
   node -e "const { createClient } = require('@supabase/supabase-js'); console.log('DB test:', !!createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY))"
   ```

## Performance Considerations

### Frequency Guidelines

- **Development**: Every 1-5 minutes for testing
- **Low Volume**: Every 15-30 minutes
- **High Volume**: Every 5-10 minutes
- **Enterprise**: Every 1-2 minutes with load balancing

### Monitoring

```bash
# Create health check endpoint
# /api/health/automation
{
  "status": "healthy",
  "lastRun": "2025-08-03T00:30:00.000Z",
  "pendingJobs": 15,
  "processingRate": "95%"
}
```

## Security Best Practices

1. **Use dedicated user for cron jobs**
2. **Restrict file permissions** (644 for scripts, 600 for env files)
3. **Use secure environment variable storage**
4. **Monitor cron job execution logs**
5. **Set up alerts for failed executions**
6. **Use service role keys with minimal permissions**

This setup ensures your campaign automation runs reliably in any environment!