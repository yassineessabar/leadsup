#!/bin/bash

echo "🚀 SETTING UP NGROK FOR SENDGRID WEBHOOK TESTING"
echo "================================================"
echo

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "📦 Installing ngrok..."
    if command -v brew &> /dev/null; then
        brew install ngrok
    else
        echo "❌ Homebrew not found. Please install ngrok manually:"
        echo "   https://ngrok.com/download"
        exit 1
    fi
fi

echo "✅ ngrok is installed"
echo

# Check if dev server is running
echo "🔍 Checking if dev server is running on port 3000..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Dev server is running"
else
    echo "❌ Dev server not running. Please start it first:"
    echo "   npm run dev"
    echo
    echo "Then run this script again."
    exit 1
fi

echo
echo "🌐 Starting ngrok tunnel..."
echo "📝 This will create a public URL that forwards to your local server"
echo
echo "⚠️  IMPORTANT: Keep this terminal open!"
echo "   When you're done testing, press Ctrl+C to stop ngrok"
echo
echo "📋 NEXT STEPS:"
echo "1. Copy the HTTPS URL that appears below"
echo "2. Go to: https://app.sendgrid.com/settings/parse" 
echo "3. Click 'Add Host & URL'"
echo "4. Configure:"
echo "   - Subdomain: reply"
echo "   - Domain: leadsup.io" 
echo "   - URL: [YOUR_NGROK_URL]/api/webhooks/sendgrid"
echo "   - Check 'POST the raw, full MIME message'"
echo "5. Send another test email and reply to it"
echo
echo "🔗 Starting ngrok on port 3000..."
echo

# Start ngrok
ngrok http 3000