# Campaign Automation Quick Start Guide

## 🚀 Easiest Setup Options

### Option 1: Automated Cron Setup (Recommended)
```bash
# Run the interactive setup script
./setup-cron.sh

# Follow the prompts to choose frequency and install
```

### Option 2: NPM Scripts (Development)
```bash
# Test automation once
npm run automation:test

# Run automation once (production mode)
npm run automation:run

# Start background daemon (runs continuously)
npm run automation:daemon

# Start background daemon in test mode
npm run automation:daemon:test
```

### Option 3: Manual Commands
```bash
# Test automation manually
node scripts/process-campaign-automation.js --test

# Run automation manually
node scripts/process-campaign-automation.js

# Start continuous daemon
node scripts/automation-daemon.js --interval=300000  # 5 minutes
```

### Option 4: Manual Cron Setup
```bash
# Open crontab editor
crontab -e

# Add this line (runs every 15 minutes in test mode)
*/15 * * * * cd /Users/yassineessabar/Documents/GitHub/loopdev && /usr/local/bin/node scripts/process-campaign-automation.js --test >> /tmp/campaign-automation.log 2>&1
```

## 📋 What Each Option Does

### Test Mode vs Production Mode

**Test Mode (`--test` flag):**
- ✅ Shows what would happen
- ✅ Processes all logic
- ❌ No actual emails/SMS sent
- ✅ Safe for development

**Production Mode (no flag):**
- ✅ Actually sends emails/SMS
- ✅ Enrolls contacts in campaigns
- ✅ Processes real automation jobs
- ⚠️ Uses real email/SMS credits

### Automation Process Flow

1. **Find Active Campaigns** with "new_client" trigger
2. **Locate Recent Contacts** (last 7 days) not enrolled
3. **Enroll Contacts** in matching campaigns
4. **Schedule Jobs** based on sequence timing
5. **Process Pending Jobs** that are due
6. **Send Messages** via email/SMS

## 🔧 Management Commands

### View Current Setup
```bash
# Check if cron job is installed
crontab -l

# View automation logs
tail -f /tmp/campaign-automation.log
# or
tail -f logs/campaign-automation.log
```

### Quick Management
```bash
# Use the management script
./manage-cron.sh

# Options:
# 1) View cron jobs
# 2) View logs
# 3) Follow logs (real-time)
# 4) Test automation manually
# 5) Remove cron job
# 6) Edit cron jobs
```

## 📊 Monitoring Your Automation

### In the Dashboard
1. Go to **Campaign → Automation Tab**
2. Check **Status Dashboard** (total/pending/completed/failed jobs)
3. View **Recent Automation Jobs** table
4. Use **"Test Trigger"** and **"Trigger Now"** buttons

### Command Line Monitoring
```bash
# View recent logs
tail -20 /tmp/campaign-automation.log

# Follow logs in real-time
tail -f /tmp/campaign-automation.log

# Test automation manually
npm run automation:test
```

## ⚡ Quick Setup for Immediate Testing

### 1. Test Right Now
```bash
npm run automation:test
```

### 2. Set Up Background Processing
```bash
# For development (test mode every 5 minutes)
npm run automation:daemon:test

# For production (real sending every 15 minutes)
./setup-cron.sh
```

### 3. Monitor Results
- Check campaign dashboard → Automation tab
- Run `tail -f /tmp/campaign-automation.log`
- Use `./manage-cron.sh` for management

## 🛠️ Troubleshooting

### No Contacts Enrolled?
```bash
# Debug with:
npm run automation:test

# Check for:
# - Active campaigns with "new_client" trigger
# - Recent contacts (last 7 days) not already enrolled
# - Campaign sequences configured
```

### Cron Not Working?
```bash
# Check cron service
sudo systemctl status cron  # Linux
launchctl list | grep cron  # macOS

# Check cron logs
tail -f /var/log/cron     # Linux
tail -f /tmp/campaign-automation.log  # Your logs
```

### Permission Issues?
```bash
# Make scripts executable
chmod +x scripts/*.js
chmod +x *.sh

# Check Node.js path
which node
```

## 🎯 Recommended Setup

### For Development
```bash
# 1. Test first
npm run automation:test

# 2. Use daemon for continuous development
npm run automation:daemon:test
```

### For Production
```bash
# 1. Test first
npm run automation:test

# 2. Set up proper cron job
./setup-cron.sh

# 3. Choose "Every 15 minutes" and disable test mode
# 4. Monitor with ./manage-cron.sh
```

This gives you multiple ways to run campaign automation based on your needs! 🚀