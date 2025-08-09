#!/bin/bash

echo "🚀 Campaign Automation Cron Job Setup"
echo "====================================="

# Get current directory
CURRENT_DIR=$(pwd)
echo "📁 Project directory: $CURRENT_DIR"

# Find Node.js path
NODE_PATH=$(which node)
echo "📦 Node.js path: $NODE_PATH"

# Check if script exists
SCRIPT_PATH="$CURRENT_DIR/scripts/process-campaign-automation.js"
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Script not found at: $SCRIPT_PATH"
    echo "   Make sure you're running this from the project root directory"
    exit 1
fi

echo "✅ Script found: $SCRIPT_PATH"

# Check for existing cron job
EXISTING_CRON=$(crontab -l 2>/dev/null | grep "process-campaign-automation")
if [ ! -z "$EXISTING_CRON" ]; then
    echo "⚠️  Existing cron job found:"
    echo "   $EXISTING_CRON"
    echo ""
    read -p "Do you want to replace it? (y/N): " replace_cron
    if [[ $replace_cron =~ ^[Yy]$ ]]; then
        # Remove existing automation cron jobs
        (crontab -l 2>/dev/null | grep -v "process-campaign-automation") | crontab -
        echo "✅ Removed existing cron job"
    else
        echo "❌ Keeping existing cron job. Exiting."
        exit 0
    fi
fi

# Ask for frequency
echo ""
echo "📅 Choose automation frequency:"
echo "1) Every minute (for testing)"
echo "2) Every 5 minutes (development)"
echo "3) Every 15 minutes (recommended)"
echo "4) Every 30 minutes (low volume)"
echo "5) Custom schedule"

read -p "Enter choice (1-5): " frequency_choice

case $frequency_choice in
    1)
        SCHEDULE="* * * * *"
        DESCRIPTION="every minute"
        ;;
    2)
        SCHEDULE="*/5 * * * *"
        DESCRIPTION="every 5 minutes"
        ;;
    3)
        SCHEDULE="*/15 * * * *"
        DESCRIPTION="every 15 minutes"
        ;;
    4)
        SCHEDULE="*/30 * * * *"
        DESCRIPTION="every 30 minutes"
        ;;
    5)
        echo "Enter custom cron schedule (e.g., '0 */2 * * *' for every 2 hours):"
        read -p "Schedule: " SCHEDULE
        DESCRIPTION="custom schedule: $SCHEDULE"
        ;;
    *)
        echo "❌ Invalid choice. Using default: every 15 minutes"
        SCHEDULE="*/15 * * * *"
        DESCRIPTION="every 15 minutes"
        ;;
esac

# Ask for test mode
echo ""
read -p "Enable test mode? (y/N) [Test mode won't send actual emails/SMS]: " test_mode
if [[ $test_mode =~ ^[Yy]$ ]]; then
    TEST_FLAG="--test"
    DESCRIPTION="$DESCRIPTION (TEST MODE)"
else
    TEST_FLAG=""
fi

# Create log directory
LOG_DIR="$CURRENT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/campaign-automation.log"

# Create the cron job command
CRON_COMMAND="$SCHEDULE cd \"$CURRENT_DIR\" && \"$NODE_PATH\" scripts/process-campaign-automation.js $TEST_FLAG >> \"$LOG_FILE\" 2>&1"

echo ""
echo "📝 Cron job configuration:"
echo "   Schedule: $DESCRIPTION"
echo "   Command: $NODE_PATH scripts/process-campaign-automation.js $TEST_FLAG"
echo "   Log file: $LOG_FILE"
echo ""

read -p "Install this cron job? (y/N): " confirm_install
if [[ ! $confirm_install =~ ^[Yy]$ ]]; then
    echo "❌ Installation cancelled"
    exit 0
fi

# Install the cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron job installed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Check cron job: crontab -l"
    echo "2. Monitor logs: tail -f \"$LOG_FILE\""
    echo "3. Test manually: cd \"$CURRENT_DIR\" && node scripts/process-campaign-automation.js --test"
    echo ""
    echo "🔧 Management commands:"
    echo "• View cron jobs: crontab -l"
    echo "• Remove cron job: crontab -e (then delete the line)"
    echo "• View logs: tail -f \"$LOG_FILE\""
    echo "• Test script: node scripts/process-campaign-automation.js --test"
    
    # Create management script
    cat > "$CURRENT_DIR/manage-cron.sh" << EOF
#!/bin/bash
echo "🔧 Campaign Automation Management"
echo "================================"
echo "1) View cron jobs"
echo "2) View logs (last 50 lines)"
echo "3) Follow logs (real-time)"
echo "4) Test automation manually"
echo "5) Remove cron job"
echo "6) Edit cron jobs"
echo ""
read -p "Choose option (1-6): " choice

case \$choice in
    1)
        echo "Current cron jobs:"
        crontab -l | grep -E "(campaign-automation|process-campaign)"
        ;;
    2)
        echo "Last 50 log entries:"
        tail -50 "$LOG_FILE"
        ;;
    3)
        echo "Following logs (press Ctrl+C to stop):"
        tail -f "$LOG_FILE"
        ;;
    4)
        echo "Running test automation..."
        cd "$CURRENT_DIR" && "$NODE_PATH" scripts/process-campaign-automation.js --test
        ;;
    5)
        echo "Removing campaign automation cron jobs..."
        (crontab -l 2>/dev/null | grep -v "process-campaign-automation") | crontab -
        echo "✅ Cron job removed"
        ;;
    6)
        crontab -e
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
EOF
    chmod +x "$CURRENT_DIR/manage-cron.sh"
    echo ""
    echo "📱 Created management script: ./manage-cron.sh"
    echo "   Run it anytime to manage your automation cron job"
    
else
    echo "❌ Failed to install cron job"
    echo "   You may need to enable cron service or check permissions"
fi