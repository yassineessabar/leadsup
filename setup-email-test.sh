#!/bin/bash

# Email Testing Setup Script
echo "🧪 Setting up Email Testing Environment"
echo "========================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    echo "💡 Please create .env.local with required environment variables"
    exit 1
fi

# Check for required environment variables
echo "🔍 Checking environment variables..."

check_env_var() {
    if grep -q "^$1=" .env.local; then
        echo "✅ $1: Found"
    else
        echo "❌ $1: Missing"
        MISSING_VARS=true
    fi
}

MISSING_VARS=false
check_env_var "SENDGRID_API_KEY"
check_env_var "NEXT_PUBLIC_SUPABASE_URL"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"

if [ "$MISSING_VARS" = true ]; then
    echo ""
    echo "❌ Missing required environment variables"
    echo "💡 Add them to .env.local:"
    echo ""
    echo "SENDGRID_API_KEY=SG.your-sendgrid-api-key"
    echo "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if required dependencies are installed
echo "🔍 Checking dependencies..."

check_dependency() {
    if npm list "$1" &> /dev/null; then
        echo "✅ $1: Installed"
    else
        echo "⚠️ $1: Installing..."
        npm install "$1"
    fi
}

check_dependency "@sendgrid/mail"
check_dependency "@supabase/supabase-js"
check_dependency "dotenv"

# Check if development server is running
echo "🔍 Checking development server..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3008/ | grep -q "200\|301\|302"; then
    echo "✅ Development server: Running"
else
    echo "⚠️ Development server: Not running"
    echo "💡 Start it in another terminal with: npm run dev"
fi

# Make test scripts executable
chmod +x run-complete-email-test.js

echo ""
echo "✅ Email testing environment setup complete!"
echo ""
echo "🚀 Ready to run tests:"
echo "  1. Basic SendGrid test:    node test-sendgrid-simple.js"
echo "  2. Complete E2E test:      node run-complete-email-test.js"
echo "  3. Webhook only test:      node test-webhook-simple.js"
echo ""
echo "📚 For detailed instructions, see: COMPLETE_EMAIL_TESTING_GUIDE.md"