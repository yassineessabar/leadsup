#!/bin/bash

# 🚀 Quick Automation Test Script
# Run this after logging in and clicking Launch button

echo "🚀 Email Automation Quick Test"
echo "=" | tr -s '=' | head -c 50 && echo

# Step 1: Find campaign ID
echo "📋 Step 1: Finding campaign ID..."
CAMPAIGN_ID=$(curl -s "http://localhost:3000/api/prospects" | jq -r '.prospects[0].campaign_id // "none"')

if [ "$CAMPAIGN_ID" = "none" ]; then
    echo "❌ No campaign ID found from prospects"
    exit 1
fi

echo "✅ Found campaign ID: $CAMPAIGN_ID"

# Step 2: Test automation endpoint
echo ""
echo "🤖 Step 2: Testing automation endpoint..."
CAMPAIGN_COUNT=$(curl -s -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
    -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | jq '.data | length // 0')

echo "📊 Campaigns ready for processing: $CAMPAIGN_COUNT"

if [ "$CAMPAIGN_COUNT" -eq 0 ]; then
    echo "⚠️ No campaigns ready - make sure you clicked Launch button after logging in"
    echo ""
    echo "🔧 To fix:"
    echo "1. Log in to your application"
    echo "2. Go to campaign dashboard" 
    echo "3. Click Launch button"
    echo "4. Run this script again"
    exit 1
fi

# Step 3: Get campaign details
echo ""
echo "📋 Step 3: Campaign details..."
curl -s -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
    -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
    jq '.data[0] | {name, status, contacts: (.contacts | length), senders: (.senders | length)}'

# Step 4: Check contacts ready
echo ""
echo "👥 Step 4: Contacts ready for email..."
curl -s -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
    -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
    jq '.data[0].contacts[] | {firstName, lastName, email: .email[0:30], sequence: .nextSequence.title}'

# Step 5: Check sender token status
echo ""
echo "🔐 Step 5: Gmail token status..."
curl -s -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \
    -H "Authorization: Basic $(echo -n 'admin:password' | base64)" | \
    jq '.data[0].senders[] | {name, email, expires_in_minutes: (((.expires_at | fromdateiso8601) - now) / 60 | floor)}'

echo ""
echo "🎉 Automation pipeline is ready!"
echo ""
echo "🔧 Next steps:"
echo "1. If tokens are expired, refresh them in campaign dashboard"
echo "2. Run: node email-sender.js"
echo "3. Check Gmail sent folder for emails"