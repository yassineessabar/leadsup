#!/bin/bash

# Domain Connect Deployment Script
# Run this to deploy the Domain Connect implementation

echo "🚀 Deploying Domain Connect Implementation..."

# 1. Install required dependencies
echo "📦 Installing dependencies..."
npm install dns @types/node

# 2. Check if database migration is needed
echo "🗄️  Database setup required:"
echo "   1. Go to Supabase SQL Editor"
echo "   2. Copy contents from database-migration.sql"
echo "   3. Execute the migration"
echo "   Press Enter when database is ready..."
read

# 3. Check environment variables
echo "🔧 Checking environment variables..."

if [ -z "$MAKE_WEBHOOK_URL" ]; then
    echo "⚠️  Add MAKE_WEBHOOK_URL to .env.local"
fi

if [ -z "$MAKE_API_KEY" ]; then
    echo "⚠️  Add MAKE_API_KEY to .env.local (optional for now)"
fi

if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo "⚠️  Add NEXT_PUBLIC_APP_URL to .env.local"
fi

# 4. Build and test
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

# 5. Show next steps
echo ""
echo "🎉 Domain Connect implementation ready!"
echo ""
echo "📋 Next steps:"
echo "   1. Test with a real domain in development"
echo "   2. Configure Make.com scenarios (optional)"
echo "   3. Deploy to production"
echo "   4. Update SendGrid integration"
echo ""
echo "📖 Full documentation: DOMAIN-CONNECT-IMPLEMENTATION.md"
echo ""
echo "🔍 Test the implementation:"
echo "   1. Go to Domain tab in your app"
echo "   2. Click 'Add domain'"
echo "   3. Enter a domain you own"
echo "   4. Choose setup method"
echo ""

# 6. Optional: Start development server
read -p "🚀 Start development server? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run dev
fi