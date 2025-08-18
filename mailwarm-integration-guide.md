# Mailwarm Integration Guide

## Setup Steps

### 1. Mailwarm Account Setup
1. Go to https://mailwarm.com
2. Sign up for free trial
3. Add domain: leadsup.io
4. Verify DNS records

### 2. SendGrid Connection
```
API Key: [Your SendGrid API Key from .env.local]
Domain: leadsup.io
Senders:
- info@leadsup.io
- hello@leadsup.io  
- contact@leadsup.io
```

### 3. Warming Configuration
```
Initial Volume: 5 emails/day per sender
Target Volume: 25 emails/day per sender
Ramp-up Period: 4-6 weeks
Business Hours: 9 AM - 6 PM UTC
Open Rate Target: 20%
Reply Rate Target: 3%
```

### 4. Integration Options

#### Option A: Full Mailwarm (Recommended)
- Mailwarm handles all warming emails
- Keep your system for campaign analytics
- Set EMAIL_SIMULATION_MODE=true

#### Option B: Hybrid Integration
- Use Mailwarm recipient API
- Your system sends to their recipients
- Requires API integration

### 5. Environment Configuration

For Option A (Full Mailwarm):
```bash
# .env.local
EMAIL_SIMULATION_MODE=true  # Let Mailwarm handle warming
MAILWARM_API_KEY=your-mailwarm-api-key
```

For Option B (Hybrid):
```bash
# .env.local  
EMAIL_SIMULATION_MODE=false
SENDGRID_API_KEY=your-sendgrid-key
MAILWARM_API_KEY=your-mailwarm-api-key
MAILWARM_RECIPIENT_ENDPOINT=https://api.mailwarm.com/v1/recipients
```

### 6. Testing
1. Start Mailwarm warming
2. Monitor for 24-48 hours
3. Check deliverability improvements
4. Adjust settings as needed

### 7. Monitoring
- Mailwarm dashboard for warming stats
- Your system for campaign analytics
- SendGrid for delivery metrics
- Combined view for full picture